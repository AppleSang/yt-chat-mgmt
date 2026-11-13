import { config } from "./config";
import { closeAnyMenus } from "./commands";
import { log, sleep } from "./logger";

const LIVE_CHAT_MODE_LABELS = /^(trò chuyện trực tiếp|live chat)\b/i;

type SwitchState = "switching" | "done" | "failed" | "off" | "unknown";

let switchState: SwitchState = "unknown";
let switchRunning = false;

const setSwitchState = (state: SwitchState): void => {
  switchState = state;
  try {
    chrome.storage.local.set({ switchStatus: { state, at: Date.now() } });
  } catch (e) {
    /* ignore */
  }
  try {
    const p = chrome.runtime.sendMessage({ type: "ytccc-switch-status", state });
    if (p && typeof (p as Promise<void>).catch === "function")
      (p as Promise<void>).catch(() => {});
  } catch (e) {
    /* ignore */
  }
  if (state === "done" || state === "failed" || state === "off")
    revealChatCurtain();
};

export const getSwitchState = (): SwitchState => switchState;
export { setSwitchState };

// ---------- Curtain ----------

let curtainEl: HTMLElement | null = null;
let curtainSafety: ReturnType<typeof setTimeout> | null = null;

const fetchExtensionIcon = (): Promise<string | null> =>
  new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "ytccc-get-resource", path: "icons/icon128.png" },
        (res) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(res && res.ok ? res.dataUrl || null : null);
        }
      );
    } catch (e) {
      resolve(null);
    }
  });

const showChatCurtain = (): void => {
  // No animation when the auto "Live chat" switch is disabled.
  if (!config.autoLiveChat) return;
  if (curtainEl) return;
  if (!document.getElementById("ytccc-curtain-style")) {
    const style = document.createElement("style");
    style.id = "ytccc-curtain-style";
    style.textContent = `
#ytccc-curtain {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: #010102;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1), transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
}
#ytccc-curtain.ytccc-curtain-out {
  opacity: 0;
  transform: scale(1.15);
  pointer-events: none;
}
.ytccc-curtain-spin-wrap {
  width: 56px;
  height: 56px;
  animation: ytccc-curtain-spin 1.6s linear infinite;
}
.ytccc-curtain-spin-wrap img,
.ytccc-curtain-spin-wrap .ytccc-curtain-fallback {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ytccc-curtain-spin-wrap img {
  border-radius: 0;
}
.ytccc-curtain-fallback {
  border: 3px solid #23252a;
  border-top-color: #5e6ad2;
  border-radius: 50%;
  display: block;
}
@keyframes ytccc-curtain-spin {
  to { transform: rotate(360deg); }
}`;
    document.documentElement.appendChild(style);
  }

  curtainEl = document.createElement("div");
  curtainEl.id = "ytccc-curtain";

  const spinner = document.createElement("div");
  spinner.className = "ytccc-curtain-spin-wrap";
  curtainEl.appendChild(spinner);
  document.body.appendChild(curtainEl);

  // Spinner image = this extension's own icon (loaded as dataURL through
  // the background SW so the page CSP cannot block it).
  void fetchExtensionIcon().then((dataUrl) => {
    if (!curtainEl || !dataUrl) return;
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "";
    spinner.textContent = "";
    spinner.appendChild(img);
  });

  if (curtainSafety) clearTimeout(curtainSafety);
  curtainSafety = setTimeout(revealChatCurtain, 30000);
};

const revealChatCurtain = (): void => {
  if (curtainSafety) clearTimeout(curtainSafety);
  const el = curtainEl;
  if (!el) return;
  curtainEl = null;
  el.classList.add("ytccc-curtain-out");
  setTimeout(() => el.remove(), 750);
};

// ---------- Mode switch loop ----------

const findModeTrigger = (): Element | null => {
  const header =
    document.querySelector("yt-live-chat-header-renderer") ||
    document.querySelector("yt-live-chat-app");
  if (!header) return null;
  let deepest: Element | null = null;
  header.querySelectorAll("*").forEach((el) => {
    if ((el as HTMLElement).offsetParent === null && el.tagName !== "BODY") return;
    const label = (el.textContent || "").trim();
    if (!label || label.length > 40 || !LIVE_CHAT_MODE_LABELS.test(label)) return;
    if (!deepest || deepest.contains(el)) deepest = el;
  });
  if (!deepest) return null;
  const found = deepest as Element;
  let node: Element | null = found;
  for (let i = 0; i < 6 && node; i++) {
    const tag = (node.tagName || "").toUpperCase();
    if (
      tag.includes("BUTTON") ||
      tag.includes("DROPDOWN") ||
      node.getAttribute("role") === "button" ||
      node.getAttribute("aria-haspopup")
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return found;
};

type CycleResult = "active" | "clicked" | "retry";

const switchCycle = async (): Promise<CycleResult> => {
  const trigger = findModeTrigger();
  let openedVia: Element | null = null;
  if (trigger) {
    openedVia = trigger;
    (trigger as HTMLElement).click();
  } else {
    const header = document.querySelector("yt-live-chat-header-renderer");
    const ovf =
      header &&
      header.querySelector("#overflow button, #overflow, #menu-button button, #menu-button");
    if (!ovf) {
      log("mode trigger not found");
      return "retry";
    }
    openedVia = ovf;
    (ovf as HTMLElement).click();
  }

  const root = document.querySelector("yt-live-chat-app") || document;
  const deadline = Date.now() + 2000;
  let done: CycleResult = "retry";
  while (Date.now() < deadline && done === "retry") {
    const items = root.querySelectorAll(
      "tp-yt-paper-item, paper-item, [role='menuitem'], [role='option'], yt-dropdown-menu .dropdown-content > *"
    );
    for (const item of items) {
      const label = (item.textContent || "").trim();
      if (!label || !LIVE_CHAT_MODE_LABELS.test(label)) continue;
      if (
        item.hasAttribute("disabled") ||
        item.getAttribute("aria-checked") === "true" ||
        item.getAttribute("checked") !== null
      ) {
        log('"Live chat" mode already active');
        done = "active";
        break;
      }
      (item as HTMLElement).click();
      log('switched to "Live chat" mode');
      done = "clicked";
      break;
    }
    if (done === "retry") await sleep(150);
  }
  if (done === "retry") closeAnyMenus(openedVia);
  else closeAnyMenus();
  return done;
};

export const ensureSwitchLoop = async (): Promise<void> => {
  // Auto "Live chat" is independent of the cleanup toggle ("Dọn lệnh"):
  // it runs even when command cleanup is disabled.
  if (switchRunning || !config.autoLiveChat) return;
  if (!document.querySelector("yt-live-chat-app, #chat-items")) return;
  switchRunning = true;
  setSwitchState("switching");
  showChatCurtain();
  let result: SwitchState = "failed";
  for (let attempt = 0; attempt < 8; attempt++) {
    await sleep(2500 + attempt * 500);
    if (!config.autoLiveChat) {
      result = "off";
      break;
    }
    const outcome = await switchCycle();
    if (outcome === "active" || outcome === "clicked") {
      result = "done";
      break;
    }
  }
  setSwitchState(result);
  switchRunning = false;
};
