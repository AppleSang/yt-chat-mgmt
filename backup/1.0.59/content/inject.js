"use strict";
(() => {
  // src/content/inject.ts
  var SELECTORS = "yt-live-chat-text-message-renderer, yt-live-chat-membership-item-renderer, yt-live-chat-paid-message-renderer";
  var findModerateParams = (obj, depth = 0) => {
    if (!obj || typeof obj !== "object" || depth > 14) return null;
    const o = obj;
    const endpoint = o.moderateLiveChatEndpoint;
    if (endpoint && endpoint.params) return String(endpoint.params);
    for (const key in o) {
      try {
        const found = findModerateParams(o[key], depth + 1);
        if (found) return found;
      } catch (e) {
      }
    }
    return null;
  };
  var extractParams = (el) => {
    try {
      const data = el.data || el.__data;
      if (data) return findModerateParams(data);
    } catch (e) {
    }
    return null;
  };
  var extractAvatar = (el) => {
    try {
      const data = el.data || el.__data;
      const thumbs = data && data.authorPhoto && Array.isArray(data.authorPhoto.thumbnails) ? data.authorPhoto.thumbnails : null;
      if (thumbs && thumbs.length) {
        return thumbs[thumbs.length - 1].url;
      }
    } catch (e) {
    }
    return null;
  };
  var extractBadges = (el) => {
    try {
      const data = el.data || el.__data;
      const badges = data && Array.isArray(data.authorBadges) ? data.authorBadges : null;
      if (badges) {
        const types = badges.map(
          (b) => b && b.liveChatAuthorBadgeRenderer && b.liveChatAuthorBadgeRenderer.type
        ).filter(Boolean);
        return types.join(",");
      }
    } catch (e) {
    }
    return null;
  };
  var extractRole = (el) => {
    try {
      const data = el.data || el.__data;
      const badges = data && Array.isArray(data.authorBadges) ? data.authorBadges : null;
      if (!badges) return null;
      let role = "viewer";
      for (const b of badges) {
        const r = b && b.liveChatAuthorBadgeRenderer;
        if (!r) continue;
        if (r.type === "owner") return "owner";
        if (r.type === "moderator") role = "moderator";
        else if (!r.type && (r.customThumbnail || r.thumbnails)) {
          if (role === "viewer") role = "member";
        }
      }
      return role;
    } catch (e) {
    }
    return null;
  };
  var publishClientInfo = () => {
    try {
      if (!window.ytcfg) return;
      const root = document.documentElement;
      const set = (key, val) => {
        if (val && root.dataset[key] !== val) root.dataset[key] = val;
      };
      set("ytcccClientVersion", window.ytcfg.get("INNERTUBE_CLIENT_VERSION"));
      set("ytcccVisitorData", window.ytcfg.get("VISITOR_DATA"));
      set("ytcccHl", window.ytcfg.get("HL") || window.ytcfg.get("INNERTUBE_CONTEXT_HL"));
      set("ytcccGl", window.ytcfg.get("GL") || window.ytcfg.get("INNERTUBE_CONTEXT_GL"));
    } catch (e) {
    }
  };
  var scanMessages = () => {
    document.querySelectorAll(SELECTORS).forEach((el) => {
      const node = el;
      if (!node.dataset.ytcccParams) {
        const params = extractParams(node);
        if (params) {
          node.setAttribute("data-ytccc-params", params);
          console.debug(
            "[YTCCC] annotated params for",
            node.tagName,
            params.slice(0, 20) + "..."
          );
        }
      }
      if (!node.dataset.ytcccAvatar) {
        const avatar = extractAvatar(node);
        if (avatar) node.setAttribute("data-ytccc-avatar", avatar);
      }
      if (node.dataset.ytcccBadges === void 0) {
        const badges = extractBadges(node);
        if (badges !== null) node.setAttribute("data-ytccc-badges", badges);
      }
      if (node.dataset.ytcccRole === void 0) {
        const role = extractRole(node);
        if (role !== null) node.setAttribute("data-ytccc-role", role);
      }
    });
  };
  var start = () => {
    const target = document.body || document.documentElement;
    scanMessages();
    new MutationObserver(scanMessages).observe(target, {
      childList: true,
      subtree: true
    });
  };
  publishClientInfo();
  var cfgTimer = setInterval(() => {
    publishClientInfo();
  }, 1e3);
  setTimeout(() => clearInterval(cfgTimer), 2e4);
  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
