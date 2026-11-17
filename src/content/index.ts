import { loadConfig, watchConfig } from "./config";
import {
  MESSAGE_SELECTOR,
  processMessage,
  revealHiddenMessages,
  initPollParams,
  initAltDelete
} from "./commands";
import { applyBadges } from "./dom";
import { applyMention, initMention, startHandleDetect } from "./mention";
import {
  EMOTE_TEXT_SELECTOR,
  POLL_SELECTOR,
  loadEmotes,
  applyEmotes,
  applyPollEmotes
} from "./emotes";
import { injectIntoCatalog, initSuggest } from "./suggest";
import { ensureSwitchLoop, getSwitchState, setSwitchState } from "./curtain";
import { initToasts } from "./toast";
import { initBanners, scheduleBannerApply } from "./banner";
import { log } from "./logger";

// Debounced per-card poll processing. Batches that contain our own
// artifacts (img[data-ytccc-poll] / span[data-ytccc-poll-src]) are skipped
// entirely so applyPollEmotes can never be triggered by its own mutations.
const pollTimers = new WeakMap<Element, number>();

const schedulePollEmotes = (card: HTMLElement): void => {
  if (pollTimers.has(card)) return;
  const t = window.setTimeout(() => {
    pollTimers.delete(card);
    applyPollEmotes(card);
  }, 150);
  pollTimers.set(card, t);
};

// Picker renderers across YouTube variants (live chat wrapper, standalone
// yt-emoji-picker-renderer, legacy tp-yt one).
const PICKER_TAGS =
  "yt-live-chat-emoji-picker-renderer, yt-emoji-picker-renderer, tp-yt-emoji-picker-renderer";

const handleAddedNode = (node: Node): void => {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (el.matches && el.matches(PICKER_TAGS)) {
    injectIntoCatalog();
  }
  if (el.querySelector && el.querySelector(PICKER_TAGS)) {
    injectIntoCatalog();
  }
  // Banner re-created or re-parented by YouTube (or by our own move — the
  // canonical check inside keeps that inert).
  if (
    el.matches &&
    el.matches("yt-live-chat-banner-manager, yt-live-chat-banner-renderer")
  ) {
    scheduleBannerApply();
  }
  if (
    el.querySelector &&
    el.querySelector("yt-live-chat-banner-manager, yt-live-chat-banner-renderer")
  ) {
    scheduleBannerApply();
  }
  if (el.matches && el.matches(MESSAGE_SELECTOR)) {
    applyBadges(el);
    void processMessage(el);
    applyEmotes(el);
    applyMention(el);
  }
  if (el.matches && el.matches(POLL_SELECTOR)) {
    schedulePollEmotes(el);
  }
  if (el.querySelectorAll) {
    el.querySelectorAll(MESSAGE_SELECTOR).forEach((child) => {
      const msg = child as HTMLElement;
      applyBadges(msg);
      void processMessage(msg);
      applyEmotes(msg);
      applyMention(msg);
    });
    el.querySelectorAll(EMOTE_TEXT_SELECTOR).forEach((t) => {
      const target = t as HTMLElement;
      if (target !== el) applyEmotes(target);
    });
    el.querySelectorAll(POLL_SELECTOR).forEach((t) => {
      schedulePollEmotes(t as HTMLElement);
    });
  }
};

  const boot = (): boolean => {
    if (!document.querySelector("yt-live-chat-app, #chat-items")) return false;
    document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR).forEach((el) => {
      applyBadges(el);
      void processMessage(el);
      applyEmotes(el);
      applyMention(el);
    });

    const emoteSweep = (): void => {
      document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR).forEach((el) => {
        applyBadges(el);
        applyEmotes(el);
        applyMention(el);
      });
    // Comments / community posts (watch pages) and viewer-engagement
    // messages (poll summaries) — engagement passes the #message element
    // itself, which applyEmotes handles since the self-element fix.
    document.querySelectorAll<HTMLElement>(EMOTE_TEXT_SELECTOR).forEach((el) => {
      if (el.matches("#content-text") || el.matches("#message")) applyEmotes(el);
    });
    // Live-chat poll cards (question + options).
    document.querySelectorAll<HTMLElement>(POLL_SELECTOR).forEach((el) => {
      applyPollEmotes(el);
    });
    injectIntoCatalog();
    // Belt-and-braces banner re-check every sweep; a no-op when in place.
    scheduleBannerApply();
  };
  setInterval(emoteSweep, 3000);

  // Emotes load asynchronously (custom + 7TV); re-sweep when they arrive so
  // items rendered before the load are not stuck as plain text.
  document.addEventListener("ytccc-emotes-loaded", emoteSweep);

  const target = document.body || document.documentElement;
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      // Skip batches that contain our own poll artifacts (our processing
      // always tags inserted elements) so we never react to ourselves.
      let own = false;
      m.addedNodes.forEach((n) => {
        if (
          n.nodeType === Node.ELEMENT_NODE &&
          (n as HTMLElement).dataset &&
          ((n as HTMLElement).dataset.ytcccPoll ||
            (n as HTMLElement).dataset.ytcccPollSrc)
        ) {
          own = true;
        }
      });
      if (own) continue;
      m.addedNodes.forEach(handleAddedNode);
      if (m.addedNodes.length && m.target && (m.target as HTMLElement).closest) {
        const msgEl = (m.target as HTMLElement).closest(MESSAGE_SELECTOR) as HTMLElement | null;
        if (msgEl) {
          applyEmotes(msgEl);
          applyMention(msgEl);
        }
        const pollEl = (m.target as HTMLElement).closest(POLL_SELECTOR) as HTMLElement | null;
        if (pollEl) schedulePollEmotes(pollEl);
      }
    }
  }).observe(target, { childList: true, subtree: true });

  log("started observing live chat:", location.href.slice(0, 80));
  void ensureSwitchLoop();
  return true;
};

const bootLoop = (): void => {
  if (boot()) return;
  const obs = new MutationObserver(() => {
    if (boot()) obs.disconnect();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
};

const main = async (): Promise<void> => {
  await loadConfig();
  watchConfig();
  initToasts();
  initBanners();
  initSuggest();
  initPollParams();
  initAltDelete();

  // Chat page: live_chat iframe on www.youtube.com, or embedded chat in
  // YouTube Studio (studio.youtube.com serves the same chat components).
  const isChatFrame =
    location.hostname === "www.youtube.com" &&
    location.pathname.startsWith("/live_chat");
  const isStudio = location.hostname === "studio.youtube.com";

  // The guide menu ("Your channel" -> /@handle) only exists on main pages,
  // never inside the live_chat iframe - detect there and share via storage.
  initMention();
  if (!isChatFrame) startHandleDetect();

  // When cleanup is turned off, show every message we had hidden again.
  // Any settings change also re-applies badges/avatars + emotes to the
  // messages already in the chat box.
  if (chrome.storage && chrome.storage.onChanged) {
    let sweepTimer: number | undefined;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (changes.enabled && changes.enabled.newValue === false) {
        revealHiddenMessages();
      }
      if (sweepTimer) window.clearTimeout(sweepTimer);
      sweepTimer = window.setTimeout(() => {
        document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR).forEach((el) => {
          applyBadges(el);
          applyEmotes(el);
        });
        document.querySelectorAll<HTMLElement>(EMOTE_TEXT_SELECTOR).forEach((el) => {
          if (el.matches("#content-text") || el.matches("#message")) applyEmotes(el);
        });
        document.querySelectorAll<HTMLElement>(POLL_SELECTOR).forEach((el) => {
          applyPollEmotes(el);
        });
      }, 300);
    });
  }

  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === "ytccc-check-mode") {
        if (getSwitchState() === "done") setSwitchState("done");
        else void ensureSwitchLoop();
      } else if (msg.type === "ytccc-toggle-panel") {
        setSwitchState(getSwitchState());
      }
    });
  }

  if (isChatFrame || isStudio) {
    void loadEmotes();
    setInterval(() => void loadEmotes(), 30000);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootLoop);
    } else {
      bootLoop();
    }
  }
};

void main();
