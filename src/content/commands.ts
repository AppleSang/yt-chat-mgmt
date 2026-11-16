import { t } from "../language/i18n";
import type { ChatRole, DeletedLogEntry } from "../language/types";
import { config, isBot } from "./config";
import { getAvatarUrl, getRole, MESSAGE_SELECTOR, qsOne } from "./dom";
import { log, sleep } from "./logger";
import { showToast } from "./toast";

const MODERATE_URL =
  "https://www.youtube.com/youtubei/v1/live_chat/moderate?prettyPrint=false";

const CREATE_POLL_URL =
  "https://www.youtube.com/youtubei/v1/live_chat/create_poll?prettyPrint=false";

const REMOVE_LABELS = [
  "remove", "delete", "xoá", "xóa", "移除", "削除", "삭제", "删除", "刪除",
  "eliminar", "supprimer", "remover", "entfernen", "удалить"
];

const processed = new WeakSet<HTMLElement>();

// YouTube truncates long link labels to "https://.../94833..." and wraps the
// real target in a /redirect href whose `q` param holds it URL-encoded, so
// textContent alone loses the actual URL. Decoding `q` recovers what the
// author posted; non-redirect anchors keep their visible label.
const unwrapChatLink = (a: Element): string => {
  const href = a.getAttribute("href") || "";
  try {
    const u = new URL(href, location.origin);
    if (u.hostname === "www.youtube.com" && u.pathname === "/redirect") {
      const q = u.searchParams.get("q");
      if (q) return q;
    }
  } catch (e) {
    /* malformed href: fall through to the visible label */
  }
  return a.textContent || "";
};

export const getMessageText = (el: HTMLElement): string => {
  const m = (qsOne(el, "#message") as HTMLElement | null) || el;
  if (!m.querySelector("a[href]")) return (m.textContent || "").trim();
  // Clone so the live DOM (Polymer bindings, emote pipeline, observer) is
  // never touched; each anchor becomes plain text with its real target.
  const clone = m.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("a[href]").forEach((a) => {
    a.replaceWith(document.createTextNode(unwrapChatLink(a)));
  });
  return (clone.textContent || "").trim();
};

const isCommand = (text: string): boolean => {
  if (!config.prefix) return false;
  return text.startsWith(config.prefix);
};

const hideLocally = (el: HTMLElement): void => {
  el.style.display = "none";
  hiddenMessages.add(el);
  if (hiddenMessages.size > 500) pruneHidden();
};

// Messages hidden by us so they can be restored when cleanup is disabled.
const hiddenMessages = new Set<HTMLElement>();

const pruneHidden = (): void => {
  for (const el of hiddenMessages) {
    if (!el.isConnected) hiddenMessages.delete(el);
  }
};

export const revealHiddenMessages = (): void => {
  for (const el of hiddenMessages) {
    if (el.isConnected) el.style.display = "";
    hiddenMessages.delete(el);
  }
};

const sha1Hex = async (str: string): Promise<string> => {
  const buf = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(str)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const buildAuthHeader = async (): Promise<string | null> => {
  const match = document.cookie.match(/(?:^|;\s*)SAPISID=([^;]+)/);
  if (!match) {
    log("SAPISID cookie not found (not logged in?)");
    return null;
  }
  // SAPISIDHASH is origin-bound: use the current page origin so the header
  // works on both www.youtube.com and studio.youtube.com.
  const origin = `${location.protocol}//${location.host}`;
  const ts = Math.floor(Date.now() / 1000);
  const hash = await sha1Hex(`${ts}_${match[1]}_${origin}`);
  return [
    `SAPISIDHASH ${ts}_${hash}`,
    `SAPISID1PHASH ${ts}_${hash}`,
    `SAPISID3PHASH ${ts}_${hash}`
  ].join(" ");
};

const waitForParams = async (
  el: HTMLElement,
  timeoutMs = 2500
): Promise<string | null> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (el.dataset.ytcccParams) return el.dataset.ytcccParams;
    await sleep(120);
  }
  return null;
};

const pressEscape = (): void => {
  try {
    for (const type of ["keydown", "keyup"]) {
      document.dispatchEvent(
        new KeyboardEvent(type, {
          key: "Escape",
          keyCode: 27,
          bubbles: true,
          cancelable: true
        }) as KeyboardEvent
      );
    }
  } catch (e) {
    /* ignore */
  }
};

const scrollerClick = (): void => {
  try {
    const scroller = document.querySelector("#item-scroller, #chat-items");
    if (scroller)
      scroller.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  } catch (e) {
    /* ignore */
  }
};

export const closeAnyMenus = (toggleBtn?: Element | null): void => {
  scrollerClick();
  pressEscape();
  if (toggleBtn) {
    try {
      (toggleBtn as HTMLElement).click();
    } catch (e) {
      /* ignore */
    }
    pressEscape();
  }
};

const deleteViaApi = async (
  el: HTMLElement,
  params: string
): Promise<boolean> => {
  const root = document.documentElement;
  const clientVersion = root.dataset.ytcccClientVersion;
  const visitorData = root.dataset.ytcccVisitorData;
  if (!clientVersion) {
    log("missing clientVersion - skip API");
    return false;
  }

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-origin": "https://www.youtube.com",
      "x-youtube-client-name": "1",
      "x-youtube-client-version": clientVersion,
      "x-goog-authuser": "0"
    };
    if (visitorData) headers["x-goog-visitor-id"] = visitorData;
    const auth = await buildAuthHeader();
    if (auth) headers.authorization = auth;

    const client: Record<string, unknown> = {
      clientName: "WEB",
      clientVersion,
      hl: root.dataset.ytcccHl || "vi",
      gl: root.dataset.ytcccGl || "VN"
    };
    if (visitorData) client.visitorData = visitorData;

    const body = {
      context: { client },
      params
    };

    const res = await fetch(MODERATE_URL, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body)
    });
    log("moderate API status:", res.status);
    if (!res.ok) log("moderate API body:", (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    log("moderate API error:", (e as Error)?.message);
    return false;
  }
};

const tryMenuDelete = async (el: HTMLElement): Promise<boolean> => {
  try {
    const menuBtn = el.querySelector("#menu button, #menu yt-icon-button");
    if (!menuBtn) return false;
    (menuBtn as HTMLElement).click();

    const root = document.querySelector("yt-live-chat-app") || document;
    const deadline = Date.now() + 1500;
    while (Date.now() < deadline) {
      const items = root.querySelectorAll(
        "tp-yt-paper-item, yt-dropdown-menu .dropdown-content paper-item, .dropdown-content tp-yt-paper-item"
      );
      for (const item of items) {
        if (!(item as HTMLElement).offsetParent && item.getClientRects().length === 0)
          continue;
        const label = (item.textContent || "").trim().toLowerCase();
        if (label && REMOVE_LABELS.includes(label)) {
          (item as HTMLElement).click();
          closeAnyMenus();
          log("deleted via menu click");
          return true;
        }
      }
      await sleep(100);
    }
    closeAnyMenus();
    return false;
  } catch (e) {
    log("menu delete error:", (e as Error)?.message);
    closeAnyMenus();
    return false;
  }
};

const logMessage = async (
  author: string,
  text: string,
  role: ChatRole,
  avatar: string | null
): Promise<void> => {
  try {
    const stored = (await (chrome.storage.local.get("deletedLog") as unknown as Promise<Record<string, unknown>>)) || {};
    const deletedLog = (stored.deletedLog as DeletedLogEntry[]) || [];
    deletedLog.unshift({ author, text, at: Date.now(), role, avatar });
    await chrome.storage.local.set({ deletedLog: deletedLog.slice(0, 200) });
  } catch (e) {
    log("log error:", (e as Error)?.message);
  }
};

// --- "!poll" ------------------------------------------------------------------
// Mods type the command; the OWNER's extension (this instance) parses it and
// creates the poll through the studio create_poll API using the owner's own
// credentials. Params/context were captured by inject.ts from the owner's
// last manual poll creation.

export interface PollCommand {
  question: string;
  options: string[];
  // At least question + 2 options are required.
  enough: boolean;
}

export const parsePollCommand = (text: string): PollCommand | null => {
  if (!config.prefix) return null;
  if (!text.startsWith(config.prefix)) return null;
  const rest = text.slice(config.prefix.length).trim();
  if (!/^poll\b/i.test(rest)) return null;
  // Fields are separated by "//": question // option 1 // option 2 ...
  const fields = rest
    .slice(4)
    .split("//")
    .map((f) => f.trim())
    .filter(Boolean);
  return {
    question: fields[0] || "",
    options: fields.slice(1),
    enough: fields.length >= 3
  };
};

// Params/context captured from the owner's manual poll creations (inject.ts
// hooks fetch/XHR in the main world) are cached in storage.local so "!poll"
// keeps working across page reloads without a fresh manual warm-up.
const seedPollParams = async (): Promise<void> => {
  try {
    const root = document.documentElement;
    if (root.dataset.ytcccPollParams) return;
    const stored = (await (chrome.storage.local.get(["pollParams", "pollContext"]) as unknown as Promise<Record<string, unknown>>)) || {};
    if (stored.pollParams) {
      root.dataset.ytcccPollParams = String(stored.pollParams);
      if (stored.pollContext) root.dataset.ytcccPollContext = String(stored.pollContext);
      log("create_poll params seeded from cache");
    }
  } catch (e) {
    /* ignore */
  }
};

const watchPollParams = (): void => {
  const root = document.documentElement;
  let last = root.dataset.ytcccPollParams || "";
  window.setInterval(() => {
    const cur = root.dataset.ytcccPollParams || "";
    if (cur && cur !== last) {
      last = cur;
      void chrome.storage.local.set({
        pollParams: cur,
        pollContext: root.dataset.ytcccPollContext || ""
      });
      log("create_poll params cached");
    }
  }, 1000);
};

export const initPollParams = (): void => {
  void seedPollParams();
  watchPollParams();
};

// Returns null on success, otherwise a human-readable failure reason.
const createPollViaApi = async (
  question: string,
  options: string[]
): Promise<string | null> => {
  const root = document.documentElement;
  const clientVersion = root.dataset.ytcccClientVersion;
  if (!clientVersion) return "thiếu clientVersion";
  await seedPollParams();
  const params = root.dataset.ytcccPollParams;
  if (!params) {
    return "thiếu params — hãy tạo 1 bình chọn thủ công trong khung chat trước";
  }

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-origin": "https://www.youtube.com",
      "x-youtube-client-name": "1",
      "x-youtube-client-version": clientVersion,
      "x-goog-authuser": "0"
    };
    const visitorData = root.dataset.ytcccVisitorData;
    if (visitorData) headers["x-goog-visitor-id"] = visitorData;
    const auth = await buildAuthHeader();
    if (auth) headers.authorization = auth;

    let client: Record<string, unknown> = {};
    if (root.dataset.ytcccPollContext) {
      try {
        client = JSON.parse(root.dataset.ytcccPollContext) as Record<string, unknown>;
      } catch (e) {
        client = {};
      }
    }
    if (!client.clientVersion) {
      client = {
        clientName: "WEB",
        clientVersion,
        hl: root.dataset.ytcccHl || "vi",
        gl: root.dataset.ytcccGl || "VN"
      };
      if (visitorData) client.visitorData = visitorData;
    }

    const body = {
      context: { client },
      params,
      questionText: { text_segments: [{ text: question }] },
      optionText: options.map((o) => ({ text_segments: [{ text: o }] }))
    };

    const res = await fetch(CREATE_POLL_URL, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body)
    });
    log("create_poll API status:", res.status);
    if (!res.ok) log("create_poll body:", (await res.text()).slice(0, 300));
    return res.ok ? null : `máy chủ trả về ${res.status}`;
  } catch (e) {
    log("create_poll error:", (e as Error)?.message);
    return `lỗi mạng: ${(e as Error)?.message || "không rõ"}`;
  }
};

// inject.ts (main world) annotates data-ytccc-role shortly after the
// message appears. If the author would count as a plain viewer/member but
// no annotation exists yet, wait briefly for it before denying a poll.
const waitForRole = async (
  el: HTMLElement,
  timeoutMs = 2000
): Promise<ChatRole> => {
  let role = getRole(el);
  const deadline = Date.now() + timeoutMs;
  while (
    !el.dataset.ytcccRole &&
    (role === "viewer" || role === "member") &&
    Date.now() < deadline
  ) {
    await sleep(120);
    role = getRole(el);
  }
  return role;
};

const handlePollCommand = async (
  el: HTMLElement,
  text: string,
  author: string,
  avatar: string | null
): Promise<void> => {
  const poll = parsePollCommand(text);
  if (!poll || !config.modPoll) return;
  const role = await waitForRole(el);
  log(
    "poll command role:",
    role,
    "(annotated:",
    el.dataset.ytcccRole || "none",
    ")"
  );
  if (role !== "moderator" && role !== "owner") {
    showToast({ title: author, body: t("modPollNotAllowed"), avatar, role });
    return;
  }
  if (!poll.enough) {
    showToast({ title: author, body: t("modPollInvalid"), avatar, role });
    return;
  }
  const error = await createPollViaApi(poll.question, poll.options);
  showToast({
    title: author,
    body: error === null ? t("modPollCreated") : t("modPollFailed", { detail: error }),
    avatar,
    role
  });
};

export const processMessage = async (el: HTMLElement): Promise<void> => {
  if (processed.has(el)) return;
  // Pinned copies (inside yt-live-chat-banner-manager) render the SAME
  // message renderer inside the pinned strip. Hiding a bot there would
  // blank a message the channel owner explicitly pinned, so moderation
  // (bot hiding + command cleanup + Alt delete) skips banner copies
  // entirely — the visual passes (badges/emotes) still run on them.
  if (el.closest("yt-live-chat-banner-manager")) return;
  const text = getMessageText(el);
  const author =
    ((qsOne(el, "#author-name") as HTMLElement | null)?.textContent?.trim()) ||
    t("unknownAuthor");
  // Bot hiding is its own feature and runs regardless of the cleanup
  // switch — the toast duration (botToastSeconds) is its only setting.
  if (isBot(author)) {
    processed.add(el);
    log("hide bot:", author);
    hideLocally(el);
    if ((config.botToastSeconds || 0) > 0) {
      showToast({
        title: author,
        // No slice: the toast linkifies + wraps the full text, and the
        // body CSS caps extreme messages, so truncation is never needed.
        body: text || t("botMessagePlaceholder"),
        avatar: getAvatarUrl(el),
        role: getRole(el),
        duration: (config.botToastSeconds || 10) * 1000
      });
    }
    return;
  }

  // Tag command rows for the Alt quick-delete hover styling. Set BEFORE the
  // enabled check so manually deleting "!" spam with Alt+click works while
  // the auto cleaner is switched off.
  if (isCommand(text)) el.dataset.ytcccCommand = "1";
  if (!config.enabled) return;
  if (!isCommand(text)) return;
  // Always attempt to delete (own/mod messages included). If deletion is
  // not permitted the message is hidden silently with no toast.
  processed.add(el);

  const avatar = getAvatarUrl(el);
  const role = getRole(el);
  log("command detected:", author, ":", text.slice(0, 60));

  // "!poll": create the poll first (owner's credentials), then let the
  // normal flow below clean the command message out of the chat.
  await handlePollCommand(el, text, author, avatar);

  await logMessage(author, text, role, avatar);

  const params = await waitForParams(el);
  let ok = false;
  if (params) {
    ok = await deleteViaApi(el, params);
    if (!ok) ok = await tryMenuDelete(el);
  } else {
    ok = await tryMenuDelete(el);
    // Opening the menu may have surfaced the moderate endpoint - retry once,
    // but only when the message actually has a context menu.
    if (!ok && el.querySelector("#menu button, #menu yt-icon-button")) {
      const retry = await waitForParams(el, 1500);
      if (retry && retry !== params) ok = await deleteViaApi(el, retry);
    }
  }
  hideLocally(el);
  if (ok) {
    showToast({
      title: author,
      body: t("cleanedPrefix", { text: text.slice(0, 60) }),
      avatar,
      role
    });
  } else {
    log("could not delete - hidden silently:", author);
  }
};

// --- Alt+click quick delete --------------------------------------------------
// Holding Alt turns chat rows into one-click delete targets: the same silent
// moderate endpoint (and context-menu fallback) the "!"-cleanup uses, so all
// auth/params paths are shared. While Alt is down a document class paints a
// red outline on hovered rows (crosshair cursor); a failed delete flashes
// the row. Non-moderators simply fail silently (flash, no state change).
let altDown = false;

const setAltHighlight = (on: boolean): void => {
  altDown = on;
  // documentElement class keeps the CSS descendant prefix valid for every
  // MESSAGE_SELECTOR tag.
  document.documentElement.classList.toggle("ytccc-alt-del-on", on);
};

const flashFailedDelete = (el: HTMLElement): void => {
  el.classList.add("ytccc-del-fail");
  window.setTimeout(() => el.classList.remove("ytccc-del-fail"), 700);
};

const altDeleteMessage = async (el: HTMLElement): Promise<void> => {
  // Same precedence as the command cleanup: use the annotated params when
  // they exist (silent API), else the context menu, retrying the API once
  // the menu surfaced the annotation.
  const known = el.dataset.ytcccParams || "";
  let ok = known ? await deleteViaApi(el, known) : false;
  if (!ok) ok = await tryMenuDelete(el);
  if (!ok && el.querySelector("#menu button, #menu yt-icon-button")) {
    const retry = await waitForParams(el, 1500);
    if (retry && retry !== known) ok = await deleteViaApi(el, retry);
  }
  if (ok) {
    // Instant local cleanup; YouTube's own deleted placeholder replaces the
    // row server-side for everyone else.
    hideLocally(el);
  } else {
    flashFailedDelete(el);
    log("alt delete failed:", getMessageText(el).slice(0, 40));
  }
};

// Alt+click is the manual arm of the command cleaner: only rows starting
// with the configured prefix are targets, replacing the 3-dot-menu dance
// on "!" spam. MESSAGE_SELECTOR joined with commas needs the document
// class prefix on EVERY selector (`.on a, b` would match bare `b` too).
const altHoverCss = MESSAGE_SELECTOR.split(",")
  .map((s) => `.ytccc-alt-del-on ${s.trim()}[data-ytccc-command]:hover`)
  .join(", ");

export const initAltDelete = (): void => {
  if (!document.getElementById("ytccc-alt-delete-style")) {
    const style = document.createElement("style");
    style.id = "ytccc-alt-delete-style";
    style.textContent =
      `${altHoverCss}{outline:1px solid rgba(244,67,54,0.9);outline-offset:-1px;cursor:crosshair;}` +
      `.ytccc-del-fail{outline:1px solid rgba(244,67,54,0.9)!important;outline-offset:-1px;}`;
    (document.head || document.documentElement).appendChild(style);
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Alt" && !altDown) setAltHighlight(true);
  }, true);
  window.addEventListener("keyup", (e) => {
    if (e.key === "Alt") setAltHighlight(false);
  }, true);
  // Focus switches while holding Alt would otherwise leave the mode stuck.
  window.addEventListener("blur", () => {
    if (altDown) setAltHighlight(false);
  });
  document.addEventListener(
    "click",
    (e) => {
      if (!altDown) return;
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;
      const msg = target.closest<HTMLElement>(MESSAGE_SELECTOR);
      if (!msg) return;
      // Pinned copies are protected by design (same rule as bot hiding).
      if (msg.closest("yt-live-chat-banner-manager")) return;
      // Command-cleaner scope: only "!" messages are Alt targets; other
      // rows keep their native click behavior (profile links, menus...).
      if (!isCommand(getMessageText(msg))) return;
      // Swallow the click so YouTube's own row handlers (author links,
      // menus) don't also fire on an Alt+click.
      e.preventDefault();
      e.stopPropagation();
      void altDeleteMessage(msg);
    },
    true
  );
};

// Re-export so other modules (mutation observer) can reach the selector.
export { MESSAGE_SELECTOR };
