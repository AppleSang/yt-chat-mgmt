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
  var fromBase64 = (value) => {
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
      const raw = atob(padded);
      return Uint8Array.from(raw, (char) => char.charCodeAt(0));
    } catch (e) {
      return null;
    }
  };
  var toBase64 = (bytes) => {
    let raw = "";
    for (const byte of bytes) raw += String.fromCharCode(byte);
    return btoa(raw);
  };
  var decodeUriFully = (value) => {
    let decoded = value;
    for (let i = 0; i < 3; i += 1) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch (e) {
        break;
      }
    }
    return decoded;
  };
  var readVarint = (bytes, start2) => {
    let value = 0;
    let shift = 0;
    for (let offset = start2; offset < bytes.length && shift < 35; offset += 1) {
      const byte = bytes[offset];
      value |= (byte & 127) << shift;
      if (!(byte & 128)) return { value, next: offset + 1 };
      shift += 7;
    }
    return null;
  };
  var findLengthDelimitedFields = (bytes, depth = 0) => {
    if (depth > 4) return [];
    const fields = [];
    let offset = 0;
    while (offset < bytes.length) {
      const tag = readVarint(bytes, offset);
      if (!tag || tag.value === 0) break;
      offset = tag.next;
      switch (tag.value & 7) {
        case 0: {
          const value = readVarint(bytes, offset);
          if (!value) return fields;
          offset = value.next;
          break;
        }
        case 1:
          offset += 8;
          break;
        case 2: {
          const length = readVarint(bytes, offset);
          if (!length || length.next + length.value > bytes.length) return fields;
          const field = bytes.slice(length.next, length.next + length.value);
          fields.push(field, ...findLengthDelimitedFields(field, depth + 1));
          offset = length.next + length.value;
          break;
        }
        case 5:
          offset += 4;
          break;
        default:
          return fields;
      }
    }
    return fields;
  };
  var makePollParams = (payload) => {
    const length = payload[0] === 10 ? readVarint(payload, 1) : null;
    if (!length || length.next + length.value > payload.length) return null;
    let targetEnd = length.next + length.value;
    const pollTypeTag = readVarint(payload, targetEnd);
    if (!pollTypeTag || pollTypeTag.value !== 32 || pollTypeTag.next !== targetEnd + 1) {
      return null;
    }
    const pollType = readVarint(payload, pollTypeTag.next);
    if (!pollType) return null;
    targetEnd = pollType.next;
    const target = payload.slice(0, targetEnd);
    const params = new Uint8Array(target.length + 2);
    params[0] = 8;
    params[1] = 1;
    params.set(target, 2);
    params[2] = 18;
    params[2 + pollTypeTag.next - 1] = 24;
    return toBase64(params);
  };
  var derivePollParamsFromContinuation = (continuation) => {
    const encoded = fromBase64(decodeUriFully(continuation));
    if (!encoded) return null;
    for (const field of findLengthDelimitedFields(encoded)) {
      const nested = new TextDecoder().decode(field);
      const payload = fromBase64(decodeUriFully(nested));
      if (!payload) continue;
      const params = makePollParams(payload);
      if (params) return params;
    }
    return null;
  };
  var derivePollParamsFromPage = () => {
    try {
      const match = location.search.match(/[?&]continuation=([^&]+)/);
      return match ? derivePollParamsFromContinuation(match[1]) : null;
    } catch (e) {
      return null;
    }
  };
  var publishPollParams = (bodyText) => {
    try {
      const body = JSON.parse(bodyText);
      if (!body || typeof body.params !== "string" || !body.params) return;
      const root = document.documentElement;
      root.dataset.ytcccPollParams = body.params;
      if (body.context && body.context.client) {
        root.dataset.ytcccPollContext = JSON.stringify(body.context.client);
      }
      console.debug("[YTCCC] captured create_poll params");
    } catch (e) {
    }
  };
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      const url = typeof input === "string" ? input : input?.url || String(input || "");
      if (url.indexOf("create_poll") !== -1) {
        if (init && typeof init.body === "string") {
          publishPollParams(init.body);
        } else if (typeof input === "object" && input instanceof Request) {
          input.clone().text().then(publishPollParams).catch(() => {
          });
        }
      }
    } catch (e) {
    }
    return origFetch.call(this, input, init);
  };
  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(...args) {
    this.__ytcccUrl = args[1];
    return xhrOpen.apply(this, args);
  };
  XMLHttpRequest.prototype.send = function(body) {
    try {
      const url = String(this.__ytcccUrl || "");
      if (typeof body === "string" && url.indexOf("create_poll") !== -1) {
        publishPollParams(body);
      }
    } catch (e) {
    }
    return xhrSend.apply(this, [body]);
  };
  var findPollParamsDeep = (obj, depth = 0) => {
    if (!obj || typeof obj !== "object" || depth > 14) return null;
    const o = obj;
    for (const key in o) {
      if (/poll/i.test(key)) {
        const v = o[key];
        if (v && typeof v === "object") {
          const params = v.params;
          if (typeof params === "string" && params) return params;
          const sub = findPollParamsDeep(v, depth + 1);
          if (sub) return sub;
        }
      } else {
        const found = findPollParamsDeep(o[key], depth + 1);
        if (found) return found;
      }
    }
    return null;
  };
  var scanPollParams = () => {
    try {
      if (document.documentElement.dataset.ytcccPollParams) return;
      const derived = derivePollParamsFromPage();
      if (derived) {
        document.documentElement.dataset.ytcccPollParams = derived;
        console.debug("[YTCCC] derived create_poll params from continuation");
        return;
      }
      const found = findPollParamsDeep(window.ytInitialData);
      if (found) {
        document.documentElement.dataset.ytcccPollParams = found;
        console.debug("[YTCCC] found create_poll params in ytInitialData");
      }
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
  scanPollParams();
  var cfgTimer = setInterval(() => {
    publishClientInfo();
    scanPollParams();
  }, 1e3);
  setTimeout(() => clearInterval(cfgTimer), 2e4);
  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
