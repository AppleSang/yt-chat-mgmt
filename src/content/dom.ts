import type { ChatRole } from "../shared/types";
import { config } from "./config";

export const MESSAGE_SELECTOR = [
  "yt-live-chat-text-message-renderer",
  "yt-live-chat-membership-item-renderer",
  "yt-live-chat-paid-message-renderer"
].join(", ");

export const ROLE_COLORS: Record<ChatRole, string> = {
  moderator: "#4285f4",
  member: "#2ba640",
  owner: "#ffb300",
  viewer: "#ffffff"
};

type MessageEl = HTMLElement & { dataset: DOMStringMap };

// nwsapi (jsdom's CSS engine) has a stale id fast-path: a lone-ID selector
// can return null when an earlier element in the document shares that id,
// even though the subtree match exists. querySelectorAll is reliable in
// both worlds, so use it as the fallback everywhere we look up ids.
export const qsOne = (root: HTMLElement, selector: string): Element | null =>
  root.querySelector(selector) || root.querySelectorAll(selector)[0] || null;

export const applyBadges = (el: MessageEl): void => {
  try {
    el.querySelectorAll(
      "#author-badges, yt-live-chat-author-badge-renderer, #chip-badges"
    ).forEach((b) => {
      (b as HTMLElement).style.display = config.hideBadges ? "none" : "";
    });
    // Chatter avatar (yt-img-shadow#author-photo).
    el.querySelectorAll("#author-photo").forEach((a) => {
      (a as HTMLElement).style.display = config.hideAvatars ? "none" : "";
    });
  } catch (e) {
    /* ignore */
  }
};

export const getRole = (el: MessageEl): ChatRole => {
  // author-type on the message renderer / author name is YouTube's own
  // role marker (owner / moderator / member; absent for viewers) — the
  // most reliable signal there is.
  const at = (el.getAttribute("author-type") || "").toLowerCase();
  if (at === "owner" || at === "moderator" || at === "member") return at;
  const nameEl = qsOne(el, "#author-name");
  if (nameEl) {
    const nr = (
      nameEl.getAttribute("author-type") ||
      nameEl.getAttribute("type") ||
      (nameEl.classList.contains("owner")
        ? "owner"
        : nameEl.classList.contains("moderator")
          ? "moderator"
          : nameEl.classList.contains("member")
            ? "member"
            : "")
    ).toLowerCase();
    if (nr === "owner" || nr === "moderator" || nr === "member") return nr;
  }
  // Exact badge type attributes beat the coarse main-world annotation
  // (a mis-annotated owner must not be denied mod actions).
  if (qsOne(el, '#author-badges [type="owner"], yt-live-chat-author-badge-renderer[type="owner"]')) return "owner";
  if (qsOne(el, '#author-badges [type="moderator"], yt-live-chat-author-badge-renderer[type="moderator"]')) return "moderator";
  if (el.dataset.ytcccRole) return el.dataset.ytcccRole as ChatRole;
  if (qsOne(el, '#author-badges [type="member"]')) return "member";
  // Last resort: localized badge tooltip / aria-label / text.
  let badges = "";
  el.querySelectorAll("#author-badges, #author-badges *, yt-live-chat-author-badge-renderer").forEach((b) => {
    const e = b as HTMLElement;
    badges +=
      " " +
      ((e.getAttribute && (e.getAttribute("aria-label") || e.getAttribute("title"))) ||
        e.textContent ||
        "");
  });
  badges = badges.toLowerCase();
  if (/\bowner\b|chủ\s*sở\s*hữu|chủ\s*kênh|\bhost\b/.test(badges)) return "owner";
  if (/moderator|quản\s*trị|quản\s*lý|\bmod\b/.test(badges)) return "moderator";
  return "viewer";
};

export const isModOrOwner = (el: MessageEl): boolean => {
  const role = getRole(el);
  return role === "moderator" || role === "owner";
};

export const getAvatarUrl = (el: MessageEl): string | null => {
  if (el.dataset.ytcccAvatar) return el.dataset.ytcccAvatar;
  try {
    const img = el.querySelector<HTMLImageElement>(
      "#author-photo img, #author-photo yt-img img"
    );
    if (img) {
      const src = img.src || img.getAttribute("data-src") || "";
      if (src.startsWith("http")) return src;
    }
  } catch (e) {
    /* ignore */
  }
  return null;
};
