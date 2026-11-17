/* Self-mention highlight: once the viewer's own channel handle is known,
   every plain-text occurrence of it in chat messages (with or without the
   leading "@") gets wrapped in a chip styled like YouTube's mention chip.
   The handle is auto-detected from the guide menu - the "Your channel"
   entry links to /@handle and is present in the DOM without any popup or
   user interaction. */

import { log } from "./logger";
import { MESSAGE_SELECTOR } from "./commands";

let ownHandle = "";

export const getOwnHandle = (): string => ownHandle;

// The guide's collapsible section hosts "Your channel" as its first entry
// (verified live: a#endpoint[href="/@handle"], title text localized but the
// structure is not). Fallback: any guide primary-link entry pointing at /@.
const GUIDE_SELECTORS = [
  "ytd-guide-collapsible-section-entry-renderer #section-items > ytd-guide-entry-renderer:first-child a[href^='/@']",
  "#guide-links-primary ytd-guide-entry-renderer a[href^='/@']"
];

const HANDLE_RE = /^\/@([\w.-]{2,30})$/;

// Reads the guide menu; returns the handle ("NotRealSang") or "" when the
// guide is not rendered (Studio pages, embedded chat frames...).
const detectOwnHandle = (): string => {
  if (ownHandle) return ownHandle;
  try {
    for (const sel of GUIDE_SELECTORS) {
      const a = document.querySelector<HTMLAnchorElement>(sel);
      const m = a && a.getAttribute("href")?.match(HANDLE_RE);
      if (m) return m[1];
    }
  } catch (e) {
    /* ignore */
  }
  return "";
};

// Runs a few attempts - the guide can render after the chat does. Resolves
// once and remembers the handle; also exposes it to the popup through
// chrome.storage.local ("Hello @user" badge when up to date).
let detectTimer: number | null = null;

// Runs the highlight over the rows already in view - used when the handle
// lands (storage boot or main-page detection) so existing messages do not
// wait for the next periodic sweep.
const sweepMentions = (): void => {
  if (!ownHandle) return;
  document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR).forEach((el) => {
    try {
      applyMention(el);
    } catch (e) {
      /* ignore */
    }
  });
};

// Boots the handle state from chrome.storage.local and follows updates:
// the guide only exists on main pages, while chat messages live in the
// live_chat iframe - a separate context that must pick the handle up from
// storage written by the main page.
export const initMention = (): void => {
  try {
    chrome.storage.local.get({ ownHandle: "" }, (d) => {
      if (d.ownHandle && !ownHandle) ownHandle = String(d.ownHandle);
      sweepMentions();
    });
    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local" || !changes.ownHandle) return;
        const v = changes.ownHandle.newValue;
        if (typeof v === "string" && v) {
          ownHandle = v;
          sweepMentions();
        }
      });
    }
  } catch (e) {
    /* storage optional in tests */
  }
};

export const startHandleDetect = (): void => {
  if (detectTimer !== null || ownHandle) return;
  let tries = 0;
  const tick = (): void => {
    const h = detectOwnHandle();
    if (h) {
      ownHandle = h;
      if (detectTimer !== null) {
        window.clearInterval(detectTimer);
        detectTimer = null;
      }
      try {
        chrome.storage.local.set({ ownHandle: h });
      } catch (e) {
        /* storage optional in tests */
      }
      log("own handle detected:", h);
      return;
    }
    if (++tries >= 12 && detectTimer !== null) {
      window.clearInterval(detectTimer);
      detectTimer = null;
    }
  };
  detectTimer = window.setInterval(tick, 300);
  tick();
};

// ---------- highlight ---------------------------------------------------------
// Mirrors YouTube's mention chip: copies background/color from a real #mention
// chip when one exists, otherwise falls back to a neutral dark-theme chip.
const ensureMentionStyle = (): void => {
  if (document.getElementById("ytccc-mention-style")) return;
  const style = document.createElement("style");
  style.id = "ytccc-mention-style";
  style.textContent =
    ".ytccc-self-mention{background:var(--ytccc-mention-bg,rgba(255,255,255,0.14));" +
    "color:var(--ytccc-mention-fg,#fff);border-radius:2px;padding:0 3px;font-weight:500;}";
  (document.head || document.documentElement).appendChild(style);
};

let styleSynced = false;

const syncMentionStyle = (): void => {
  if (styleSynced) return;
  try {
    const chip = document.querySelector("#message #mention");
    if (!chip) return;
    const cs = window.getComputedStyle(chip);
    document.documentElement.style.setProperty("--ytccc-mention-bg", cs.backgroundColor);
    document.documentElement.style.setProperty("--ytccc-mention-fg", cs.color);
    styleSynced = true;
  } catch (e) {
    /* ignore */
  }
};

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Scoped lookups like el.querySelector("#message") break in nwsapi (jsdom's
// selector engine) when the document holds duplicate ids - every chat row has
// a #message span, and the id fast-path only ever returns the document-wide
// first match. A plain subtree scan keeps the lookup correct in any engine.
const messageOf = (el: HTMLElement): HTMLElement | null => {
  if (el.matches("#message")) return el;
  const all = el.getElementsByTagName("*");
  for (let i = 0; i < all.length; i++) {
    if ((all[i] as HTMLElement).id === "message") return all[i] as HTMLElement;
  }
  return null;
};

// Word-safe matcher: optional leading @, no word characters or @ glued to
// either side ("@NotRealSang", "NotRealSang" match; "x@NotRealSang" does not).
const mentionPattern = (): RegExp =>
  new RegExp("(?<![\\w@])@?" + escapeRe(ownHandle) + "(?![\\w@])", "gi");

const wrapTargets = (node: Text): boolean => {
  const parent = node.parentElement;
  if (!parent || !parent.matches) return false;
  // Skip YouTube's own mention chips, our previous wraps and emote artifacts.
  if (parent.matches("#mention") || parent.closest(".ytccc-self-mention")) return false;
  const val = node.nodeValue || "";
  if (!val || val.includes("\u200b")) return false;
  return val.toLowerCase().includes(ownHandle.toLowerCase());
};

export const applyMention = (el: HTMLElement): void => {
  if (!ownHandle) return;
  const message = messageOf(el);
  if (!message) return;
  ensureMentionStyle();
  syncMentionStyle();
  const pattern = mentionPattern();
  const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (wrapTargets(node)) targets.push(node);
  }
  for (const node of targets) {
    const text = node.nodeValue || "";
    const frag = document.createDocumentFragment();
    let last = 0;
    let matched = false;
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      matched = true;
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      const span = document.createElement("span");
      span.className = "ytccc-self-mention";
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    // A target whose pattern produced nothing (cheap check passed, word
    // boundaries rejected) would be replaced by an identical node - that
    // mutation re-triggers the observer and loops forever.
    if (!matched) continue;
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    node.parentNode!.replaceChild(frag, node);
  }
};
