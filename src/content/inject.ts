/**
 * MAIN-world annotator: extracts YouTube player data (moderate params,
 * avatar, role, client info) and publishes it via data-* attributes so the
 * isolated content script can read it.
 */

const SELECTORS =
  "yt-live-chat-text-message-renderer, yt-live-chat-membership-item-renderer, yt-live-chat-paid-message-renderer";

export {};

declare global {
  interface Window {
    ytcfg?: { get: (key: string) => string | undefined };
    ytInitialData?: unknown;
  }
}

const findModerateParams = (obj: unknown, depth = 0): string | null => {
  if (!obj || typeof obj !== "object" || depth > 14) return null;
  const o = obj as Record<string, unknown>;
  const endpoint = o.moderateLiveChatEndpoint as Record<string, unknown> | undefined;
  if (endpoint && endpoint.params) return String(endpoint.params);
  for (const key in o) {
    try {
      const found = findModerateParams(o[key], depth + 1);
      if (found) return found;
    } catch (e) {
      /* ignore */
    }
  }
  return null;
};

const extractParams = (el: HTMLElement): string | null => {
  try {
    const data = (el as unknown as { data?: unknown }).data ||
      (el as unknown as { __data?: unknown }).__data;
    if (data) return findModerateParams(data);
  } catch (e) {
    /* ignore */
  }
  return null;
};

const extractAvatar = (el: HTMLElement): string | null => {
  try {
    const data = (el as unknown as { data?: any }).data ||
      (el as unknown as { __data?: any }).__data;
    const thumbs =
      data && data.authorPhoto && Array.isArray(data.authorPhoto.thumbnails)
        ? data.authorPhoto.thumbnails
        : null;
    if (thumbs && thumbs.length) {
      return thumbs[thumbs.length - 1].url as string;
    }
  } catch (e) {
    /* ignore */
  }
  return null;
};

const extractBadges = (el: HTMLElement): string | null => {
  try {
    const data = (el as unknown as { data?: any }).data ||
      (el as unknown as { __data?: any }).__data;
    const badges =
      data && Array.isArray(data.authorBadges) ? data.authorBadges : null;
    if (badges) {
      const types = badges
        .map(
          (b: any) =>
            b &&
            b.liveChatAuthorBadgeRenderer &&
            b.liveChatAuthorBadgeRenderer.type
        )
        .filter(Boolean);
      return types.join(",");
    }
  } catch (e) {
    /* ignore */
  }
  return null;
};

const extractRole = (el: HTMLElement): string | null => {
  try {
    const data = (el as unknown as { data?: any }).data ||
      (el as unknown as { __data?: any }).__data;
    const badges =
      data && Array.isArray(data.authorBadges) ? data.authorBadges : null;
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
    /* ignore */
  }
  return null;
};

const publishClientInfo = (): void => {
  try {
    if (!window.ytcfg) return;
    const root = document.documentElement;
    const set = (key: string, val: string | undefined): void => {
      if (val && root.dataset[key] !== val) root.dataset[key] = val;
    };
    set("ytcccClientVersion", window.ytcfg.get("INNERTUBE_CLIENT_VERSION"));
    set("ytcccVisitorData", window.ytcfg.get("VISITOR_DATA"));
    set("ytcccHl", window.ytcfg.get("HL") || window.ytcfg.get("INNERTUBE_CONTEXT_HL"));
    set("ytcccGl", window.ytcfg.get("GL") || window.ytcfg.get("INNERTUBE_CONTEXT_GL"));
  } catch (e) {
    /* ignore */
  }
};

// --- create_poll capture -----------------------------------------------------
// The Studio chat continuation contains the same poll target as a manual
// create_poll request. Decode that first so the first !poll does not require
// a throwaway poll; request capture remains a compatibility fallback.
const fromBase64 = (value: string): Uint8Array | null => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const raw = atob(padded);
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  } catch (e) {
    return null;
  }
};

const toBase64 = (bytes: Uint8Array): string => {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
};

const decodeUriFully = (value: string): string => {
  let decoded = value;
  // Studio currently encodes the nested params twice. Stop on stability so
  // a future single-encoded continuation follows the same path.
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

const readVarint = (
  bytes: Uint8Array,
  start: number
): { value: number; next: number } | null => {
  let value = 0;
  let shift = 0;
  for (let offset = start; offset < bytes.length && shift < 35; offset += 1) {
    const byte = bytes[offset];
    value |= (byte & 0x7f) << shift;
    if (!(byte & 0x80)) return { value, next: offset + 1 };
    shift += 7;
  }
  return null;
};

const findLengthDelimitedFields = (
  bytes: Uint8Array,
  depth = 0
): Uint8Array[] => {
  if (depth > 4) return [];
  const fields: Uint8Array[] = [];
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

const makePollParams = (payload: Uint8Array): string | null => {
  // The nested continuation field is protobuf field 1 (0x0a). create_poll
  // expects that field as field 2 (0x12), prefixed by version field 1 = 1.
  const length = payload[0] === 0x0a ? readVarint(payload, 1) : null;
  if (!length || length.next + length.value > payload.length) return null;
  let targetEnd = length.next + length.value;
  // Keep the poll type field but discard later continuation-only metadata.
  // Studio labels it as field 4 (0x20); create_poll expects field 3 (0x18).
  const pollTypeTag = readVarint(payload, targetEnd);
  if (!pollTypeTag || pollTypeTag.value !== 0x20 || pollTypeTag.next !== targetEnd + 1) {
    return null;
  }
  const pollType = readVarint(payload, pollTypeTag.next);
  if (!pollType) return null;
  targetEnd = pollType.next;
  const target = payload.slice(0, targetEnd);
  const params = new Uint8Array(target.length + 2);
  params[0] = 0x08;
  params[1] = 0x01;
  params.set(target, 2);
  params[2] = 0x12;
  params[2 + pollTypeTag.next - 1] = 0x18;
  return toBase64(params);
};

const derivePollParamsFromContinuation = (continuation: string): string | null => {
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

const derivePollParamsFromPage = (): string | null => {
  try {
    const match = location.search.match(/[?&]continuation=([^&]+)/);
    return match ? derivePollParamsFromContinuation(match[1]) : null;
  } catch (e) {
    return null;
  }
};

// Capture an actual request when the continuation format is unavailable or
// changes. This keeps a known-good path instead of guessing opaque API data.
const publishPollParams = (bodyText: string): void => {
  try {
    const body = JSON.parse(bodyText) as {
      params?: unknown;
      context?: { client?: unknown };
    };
    if (!body || typeof body.params !== "string" || !body.params) return;
    const root = document.documentElement;
    root.dataset.ytcccPollParams = body.params;
    if (body.context && body.context.client) {
      root.dataset.ytcccPollContext = JSON.stringify(body.context.client);
    }
    console.debug("[YTCCC] captured create_poll params");
  } catch (e) {
    /* ignore */
  }
};

const origFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const url =
      typeof input === "string" ? input : (input as Request)?.url || String(input || "");
    if (url.indexOf("create_poll") !== -1) {
      if (init && typeof init.body === "string") {
        publishPollParams(init.body);
      } else if (typeof input === "object" && input instanceof Request) {
        // Body may live inside the Request object itself.
        input
          .clone()
          .text()
          .then(publishPollParams)
          .catch(() => {});
      }
    }
  } catch (e) {
    /* ignore */
  }
  return origFetch.call(this, input, init);
};

const xhrOpen = XMLHttpRequest.prototype.open;
const xhrSend = XMLHttpRequest.prototype.send;
(XMLHttpRequest.prototype as unknown as { open: unknown }).open = function (
  this: unknown,
  ...args: unknown[]
) {
  (this as unknown as { __ytcccUrl?: unknown }).__ytcccUrl = args[1];
  return (xhrOpen as unknown as (...a: unknown[]) => unknown).apply(this, args);
};
(XMLHttpRequest.prototype as unknown as { send: unknown }).send = function (
  this: unknown,
  body: unknown
) {
  try {
    const url = String((this as unknown as { __ytcccUrl?: unknown }).__ytcccUrl || "");
    if (typeof body === "string" && url.indexOf("create_poll") !== -1) {
      publishPollParams(body);
    }
  } catch (e) {
    /* ignore */
  }
  return (xhrSend as unknown as (b: unknown) => unknown).apply(this, [body]);
};

const findPollParamsDeep = (obj: unknown, depth = 0): string | null => {
  if (!obj || typeof obj !== "object" || depth > 14) return null;
  const o = obj as Record<string, unknown>;
  for (const key in o) {
    if (/poll/i.test(key)) {
      const v = o[key];
      if (v && typeof v === "object") {
        const params = (v as Record<string, unknown>).params;
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

const scanPollParams = (): void => {
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
    /* ignore */
  }
};

const scanMessages = (): void => {
  document.querySelectorAll(SELECTORS).forEach((el) => {
    const node = el as HTMLElement;
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
    if (node.dataset.ytcccBadges === undefined) {
      const badges = extractBadges(node);
      if (badges !== null) node.setAttribute("data-ytccc-badges", badges);
    }
    if (node.dataset.ytcccRole === undefined) {
      const role = extractRole(node);
      if (role !== null) node.setAttribute("data-ytccc-role", role);
    }
  });
};

const start = (): void => {
  const target = document.body || document.documentElement;
  scanMessages();
  new MutationObserver(scanMessages).observe(target, {
    childList: true,
    subtree: true
  });
};

publishClientInfo();
scanPollParams();
const cfgTimer = setInterval(() => {
  publishClientInfo();
  scanPollParams();
}, 1000);
setTimeout(() => clearInterval(cfgTimer), 20000);

if (document.body) {
  start();
} else {
  document.addEventListener("DOMContentLoaded", start);
}
