import { t } from "../language/i18n";
import type { ToastOptions } from "../language/types";
import { config, onToastPositionChange } from "./config";
import { ROLE_COLORS } from "./dom";
import { applyEmotesToElement } from "./emotes";
import { applyMentionToElement } from "./mention";

const injectToastStyles = (): void => {
  if (document.getElementById("ytccc-toast-styles")) return;
  const style = document.createElement("style");
  style.id = "ytccc-toast-styles";
  style.textContent = `
#ytccc-toasts {
  /* Overlay the chat column instead of re-flowing it: an in-flow stack
     pushed the message list around on every toast. absolute ALSO activates
     the z-index (static boxes ignore it), so the stack paints above the
     list. The container is only ever appended inside
     yt-live-chat-renderer #chat — one iframe document — so the absolute
     box can never spill into main-page frames. */
  position: absolute;
  z-index: 2147483647;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  font-family: Roboto, Arial, sans-serif;
  width: fit-content;
  max-width: calc(100% - 24px);
  max-height: 45%;
  overflow: hidden;
}
#ytccc-toasts.ytccc-dock-top {
  top: 8px;
}
#ytccc-toasts.ytccc-dock-bottom {
  bottom: 8px;
}
/* Zero footprint while empty: until the first toast arrives the stack must
   not reserve a strip of the chat column. :empty is reliable here because
   only element nodes are ever appended (no stray text nodes). */
#ytccc-toasts:empty {
  width: 0;
  height: 0;
  margin: 0;
  display: none;
}
.ytccc-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(32, 33, 36, 0.97);
  color: #e8eaed;
  padding: 12px 14px;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  animation: ytccc-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  transition: opacity 0.25s, transform 0.25s;
  will-change: transform, opacity;
  pointer-events: auto;
  cursor: default;
}
.ytccc-toast a {
  color: #8ab4f8;
  text-decoration: underline;
  word-break: break-all;
}
.ytccc-toast a:hover {
  color: #aecbfa;
}
.ytccc-toast img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #5f6368;
  object-fit: cover;
}
.ytccc-toast .ytccc-title {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.3;
}
.ytccc-toast .ytccc-body {
  font-size: 12px;
  color: #bdc1c6;
  line-height: 1.4;
  word-break: break-word;
  /* Guard against wall-of-text spam: normal messages are unaffected,
     only pathologically long ones start scrolling instead of growing. */
  max-height: 40vh;
  overflow-y: auto;
}
.ytccc-toast.ytccc-out {
  opacity: 0;
  transform: translateX(110%);
}
@keyframes ytccc-slide-in {
  from { opacity: 0; transform: translateX(110%); }
  to { opacity: 1; transform: none; }
}`;
  document.documentElement.appendChild(style);
};

export const initToasts = (): void => {
  injectToastStyles();
  // Config already carries the new position when listeners run, so moving
  // the stack first makes the preview appear in the freshly chosen slot.
  onToastPositionChange(() => {
    const container = document.getElementById("ytccc-toasts");
    if (container) placeContainer(container);
    showPreviewToast();
  });
};

// The chat column only exists inside the live-chat document (the chat iframe
// embedded on watch / studio pages). Scoping the lookup this tightly keeps
// the main page frames — which can also carry an unrelated id="chat" wrapper
// — completely toast-free.
const findChatColumn = (): HTMLElement | null => {
  const root = document.documentElement;
  return ((root.querySelector("yt-live-chat-app yt-live-chat-renderer #chat") ||
    root.querySelectorAll("yt-live-chat-app yt-live-chat-renderer #chat")[0] ||
    null) as HTMLElement | null);
};

// Dock the container inside YouTube's #chat column (first child = above the
// message list, last child = below it). Returns the placed container, or
// null when there is no chat column — toasts never leave the chat renderer.
const placeContainer = (container: HTMLElement): HTMLElement | null => {
  const chat = findChatColumn();
  if (!chat) return null;
  const inPlace =
    container.parentElement === chat &&
    (config.toastPosition === "top"
      ? chat.firstElementChild === container
      : chat.lastElementChild === container);
  if (!inPlace) {
    if (config.toastPosition === "top") chat.insertBefore(container, chat.firstChild);
    else chat.appendChild(container);
  }
  container.classList.add("ytccc-docked");
  // CSS classes drive the absolute anchor (top vs bottom edge); toggling
  // keeps a reused container in sync with the current setting.
  container.classList.toggle("ytccc-dock-top", config.toastPosition === "top");
  container.classList.toggle("ytccc-dock-bottom", config.toastPosition !== "top");
  return container;
};

// Preview shown right after the position option changes: extension avatar +
// brand name + a localized pointer to the GitHub repo (URL auto-links below).
// Duration follows the bot-toast display-time setting so the preview shows
// exactly as long as real toasts will; a 0s setting still keeps showToast's
// ~2.8s floor so the preview stays readable.
export const showPreviewToast = (): void => {
  showToast({
    title: "yt-chat-mgmt",
    body: t("toastPreviewBody"),
    avatar: chrome.runtime.getURL("icons/icon128.png"),
    role: "viewer",
    duration: config.botToastSeconds * 1000
  });
};

export const showToast = (opts: ToastOptions): void => {
  const { title, body, avatar, role, duration } = opts;
  try {
    let container = document.getElementById("ytccc-toasts") as HTMLElement | null;
    if (!container) {
      container = document.createElement("div");
      container.id = "ytccc-toasts";
    }
    // Outside the live chat renderer (main page frames, etc.) there is no
    // dock target: stay silent instead of spilling a floating overlay.
    if (!placeContainer(container)) return;
    while (container.children.length >= 4) {
      container.firstChild!.remove();
    }

    const toast = document.createElement("div");
    toast.className = "ytccc-toast";

    if (avatar) {
      const img = document.createElement("img");
      img.src = avatar;
      img.alt = "";
      toast.appendChild(img);
    }

    const content = document.createElement("div");
    const titleEl = document.createElement("div");
    titleEl.className = "ytccc-title";
    titleEl.textContent = title;
    titleEl.style.color = ROLE_COLORS[role || "viewer"];
    const bodyEl = document.createElement("div");
    bodyEl.className = "ytccc-body";
    const urlRe = /https?:\/\/[^\s]+/gi;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(body || ""))) {
      if (m.index > lastIdx) {
        bodyEl.appendChild(document.createTextNode(body.slice(lastIdx, m.index)));
      }
      const href = m[0].replace(/[.,!?)\]]+$/, "");
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = href;
      bodyEl.appendChild(a);
      lastIdx = m.index + href.length;
    }
    if (lastIdx < (body || "").length) {
      bodyEl.appendChild(document.createTextNode(body.slice(lastIdx)));
    }
    // Toasts mirror the chat: known emote keywords render as images and the
    // viewer's own handle gets the mention highlight (links stay untouched).
    applyEmotesToElement(bodyEl);
    applyMentionToElement(bodyEl);
    content.appendChild(titleEl);
    content.appendChild(bodyEl);
    toast.appendChild(content);

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("ytccc-out");
      setTimeout(() => toast.remove(), 500);
    }, Math.max(1000, Number(duration) || 2800));
  } catch (e) {
    /* ignore */
  }
};
