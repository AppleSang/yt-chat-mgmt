import { config, onBannerPositionChange } from "./config";

// Pinned-message placement. Moving the banner MANAGER node in the DOM loses a
// tug-of-war with YouTube: ~3s after an external move the platform re-parents
// the manager back to its native slot (verified live on 2026-11 streams) and
// the strip visibly jumps back. The manager's parent is a flex column
// (#contents with display:flex;flex-direction:column), so placement is done
// purely with CSS `order` on its flex items — that survives every YouTube
// re-parenting/re-render, needs zero DOM mutation, and individual banner
// renderers are never touched, so YouTube's own banner lifecycle (pin,
// collapse, unpick) keeps working on whichever side the strip sits.
//
// Scoping note: there are TWO #contents divs in the live-chat tree (an
// app-level one wrapping the renderer, and the flex column inside it). The
// selector is anchored to `yt-live-chat-renderer #contents`, which matches
// only the inner column because the app-level one is an ANCESTOR of the
// renderer, never a descendant.

// Explicit orders for both modes (index = flex order). "top" places the
// banner between the separator and the chat column; "bottom" pins the
// current native DOM order so a future YouTube reorder can never silently
// flip the setting's meaning. Unlisted children keep the auto order (0),
// which sorts before every explicit one — harmless for hidden dom-if
// wrappers and any node added later by YouTube.
const ORDER_NAMES: Record<"top" | "bottom", string[]> = {
  top: [
    "#ticker",
    "#separator",
    "yt-live-chat-banner-manager",
    "#chat",
    "#inline-toast-container",
    "#panel-pages"
  ],
  bottom: [
    "#ticker",
    "#separator",
    "#chat",
    "yt-live-chat-banner-manager",
    "#inline-toast-container",
    "#panel-pages"
  ]
};

const buildOrderCss = (pos: "top" | "bottom"): string =>
  ORDER_NAMES[pos]
    .map((name, i) => {
      // Top mode also lifts the strip above the chat column (the reordered
      // column could otherwise paint the chat over the strip) and pins its
      // height so the flex column can never squeeze the pinned message
      // away. Bottom mode stays a pure native-order mirror.
      const extra =
        name === "yt-live-chat-banner-manager" && pos === "top"
          ? ";position:relative;z-index:2;flex-shrink:0"
          : "";
      return `yt-live-chat-renderer #contents > ${name}{order:${i}${extra}}`;
    })
    .join("");

export const applyBannerPosition = (): void => {
  const desired = buildOrderCss(config.bannerPosition);
  let style = document.getElementById(
    "ytccc-banner-order-style"
  ) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "ytccc-banner-order-style";
    (document.head || document.documentElement).appendChild(style);
  }
  // Canonical check first: identical text = inert application, so repeated
  // calls (config change, periodic sweep re-check) can never loop, flicker
  // or churn the DOM.
  if (style.textContent === desired) return;
  style.textContent = desired;
};

// Re-apply hook for the periodic sweep and YouTube-driven rebuilds; the
// canonical check inside makes repeat applications harmless.
let applyTimer: number | undefined;
export const scheduleBannerApply = (): void => {
  if (applyTimer) window.clearTimeout(applyTimer);
  applyTimer = window.setTimeout(() => {
    applyTimer = undefined;
    applyBannerPosition();
  }, 150);
};

export const initBanners = (): void => {
  applyBannerPosition();
  // Config carries the new position when listeners run; apply right away so
  // the banner swaps sides the moment the popup tile is pressed.
  onBannerPositionChange(applyBannerPosition);
};
