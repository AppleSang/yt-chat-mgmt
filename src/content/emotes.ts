import type { Emote } from "../shared/types";
import { log } from "./logger";

let emotes: Emote[] = [];
let customEmotes: Emote[] = [];
let sevenTvEmotes: Emote[] = [];
let emotePattern: RegExp | null = null;
const emoteKeywordSet = new Set<string>();
const emoteKeywordMap = new Map<string, Emote>();
const emoteUrls: Record<string, string> = {};

// Text containers that can hold emote names: live chat message bodies and
// comment / community-post bodies.
export const EMOTE_TEXT_SELECTOR = "#message, #content-text";

// Live-chat poll cards (question + options) get emotes applied to their
// whole text content; only known keywords are replaced so vote counts and
// buttons stay untouched.
export const POLL_SELECTOR = [
  "yt-live-chat-text-poll-renderer",
  "yt-live-chat-poll-renderer"
].join(", ");

// High-quality emoji switch: when on, 7TV emotes render from their "4x.webp"
// CDN variant instead of "2x.webp". Custom emotes (emotes.json dataURLs) have
// no size variants, so they are unaffected.
let emoteHq = false;
// 4x URLs may only be used once the 4x cache pass has finished (done4x);
// until then 4x mode runs on the 2x URLs (see the popup warning).
let emoteHqReady = false;

const extResource = (path: string): Promise<string | null> =>
  new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: "ytccc-get-resource", path },
        (res) => {
          if (chrome.runtime.lastError) {
            log("resource error:", chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
          resolve(res && res.ok ? res.dataUrl || res.text || null : null);
        }
      );
    } catch (e) {
      log("sendMessage fail:", (e as Error)?.message);
      resolve(null);
    }
  });

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPattern = (): void => {
  emoteKeywordSet.clear();
  emoteKeywordMap.clear();
  for (const e of emotes) {
    const k = e.keyword.toLowerCase();
    emoteKeywordSet.add(k);
    emoteKeywordMap.set(k, e);
  }
  if (!emotes.length) {
    emotePattern = null;
    return;
  }
  const names = emotes
    .map((e) => e.keyword)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  // Unicode-aware word boundaries: WIDEBANTUMLUM must not match BANTUMLUM,
  // longer names first so shorter ones do not shadow them.
  emotePattern = new RegExp(
    "(?<![\\p{L}\\p{N}_])(" + names.join("|") + ")(?![\\p{L}\\p{N}_])",
    "gu"
  );
};

type RawEmote = unknown;

const parseEmotes = (data: RawEmote): Emote[] =>
  (Array.isArray(data) ? data : [])
    .map((item): Emote | null => {
      if (Array.isArray(item)) {
        return { keyword: String(item[0] || ""), file: String(item[1] || ""), source: "custom" };
      }
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return {
          keyword: String(o.name || o.keyword || ""),
          file: String(o.path || o.file || ""),
          source: "custom"
        };
      }
      return null;
    })
    .filter((e): e is Emote => !!(e && e.keyword && e.file));

export const loadEmotes = async (): Promise<void> => {
  let data: RawEmote = null;
  const text = await extResource("emotes.json");
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      log("emotes.json parse fail:", (e as Error)?.message);
    }
  }
  customEmotes = parseEmotes(data);
  for (const em of customEmotes) {
    if (!emoteUrls[em.file]) {
      const res = await extResource(em.file);
      if (res) emoteUrls[em.file] = res;
    }
  }
  emotes = customEmotes;
  buildPattern();
  log("loaded emotes:", emotes.length, "(custom:", customEmotes.length, ")");
  // Notify the sweeper: items rendered before this async load would
  // otherwise stay plain text until the next periodic sweep.
  document.dispatchEvent(new CustomEvent("ytccc-emotes-loaded"));
  // 7TV loads in the background so chat stays functional if it fails.
  void load7tvEmotes();
};

// --- 7TV (unofficial, via public 7tv.io/v3) ---------------------------------
// Approach follows syocless/7tv-for-youtube: global set + user sets, direct
// CDN image URLs (no dataURL conversion, so memory stays flat).

// Resolve the CDN variant URLs once per set load: "low" keeps the legacy
// pick order (2x.webp → any WEBP → first file) so toggling HQ off can never
// change what was rendered before the feature existed; "hq" is the plain
// 4x.webp file when the host provides one.
const build7tvUrl = (host: { url?: string; files?: Array<{ name?: string; format?: string }> }): { low: string; hq: string | null } | null => {
  try {
    const files = host.files || [];
    const pick =
      files.find((f) => f.name === "2x.webp") ||
      files.find((f) => f.format === "WEBP") ||
      files[0];
    if (!pick || !pick.name) return null;
    const base = (host.url || "").startsWith("//") ? "https:" + host.url : host.url || "";
    const hqFile = files.find((f) => f.name === "4x.webp");
    return {
      low: `${base}/${pick.name}`,
      hq: hqFile && hqFile.name ? `${base}/${hqFile.name}` : null
    };
  } catch (e) {
    return null;
  }
};

export const parse7tvSetIds = (raw: string): string[] =>
  raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const at = token.indexOf("/emote-sets/");
      return at >= 0 ? token.slice(at + "/emote-sets/".length).replace(/[^0-9A-Za-z]+$/, "") : token;
    });

// 7tv.io fetches run in the background service worker: fetches from inside
// YouTube's live_chat frame get logged as "Unsafe attempt to load URL ..."
// (frame origin check) even though the host permission exists.
const fetch7tvSet = (id: string): Promise<{ emotes?: unknown[] } | null> =>
  new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "ytccc-fetch-7tv", id }, (res) => {
        const r = res as { ok?: boolean; status?: number; data?: unknown } | undefined;
        if (chrome.runtime.lastError) {
          log("7tv set", id, "error:", chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        if (!r || !r.ok) {
          log("7tv set", id, "status:", r ? r.status : "no-response");
          resolve(null);
          return;
        }
        resolve((r.data || null) as { emotes?: unknown[] } | null);
      });
    } catch (e) {
      log("7tv set", id, "error:", (e as Error)?.message);
      resolve(null);
    }
  });

// --- 7TV emote cache (safe, chunked writes) ---------------------------------
// The parsed emote list is cached in storage.local and applied instantly on
// page load; the network only refreshes when the cache is stale or
// incomplete. Writes are chunked (10 emotes every 3s, 2x pass first, then
// 4x) so no single big storage write ever blocks the page — the freeze that
// killed v1.0.86 came from one multi-hundred-KB write during boot plus an
// immediate full-list regex build and document sweep.
const STV_CACHE_KEY = "emoteStvCache";
const STV_CACHE_CHUNK = 30; // emotes persisted per tick
const STV_CACHE_TICK_MS = 3000;
const STV_CACHE_TTL = 60 * 60 * 1000; // 1h

interface StvCache {
  ver?: number;
  ids?: string[];
  at?: number;
  // Job bookkeeping for the popup's progress bar / ETA.
  total?: number;
  w2x?: number;
  w4x?: number;
  done2x?: boolean;
  done4x?: boolean;
  emotes?: Emote[];
}

let writerTimer: ReturnType<typeof setTimeout> | undefined;
// Last fetched data + set ids: lets a mid-session 4x toggle start the 4x
// cache pass without refetching.
let lastAdded: Emote[] = [];
let lastIds: string[] = [];

const stopStvWriter = (): void => {
  if (writerTimer) {
    clearTimeout(writerTimer);
    writerTimer = undefined;
  }
};

// Entries persist without fileHq during the 2x pass; the 4x pass fills
// fileHq entry by entry, so a partially cached set still applies fully.
const stripHq = (e: Emote): Emote => ({
  keyword: e.keyword,
  file: e.file,
  setId: e.setId,
  source: e.source
});

const startStvCacheWriter = (added: Emote[], ids: string[], seed2x: number, seed4x = 0): void => {
  stopStvWriter();
  let w2x = Math.max(0, Math.min(seed2x, added.length));
  // The 4x pass never overtakes the 2x pass: entries must exist as 2x
  // before their 4x variant can be persisted.
  let w4x = Math.max(0, Math.min(seed4x, w2x));
  let flipped = false;

  const persist = async (): Promise<void> => {
    const list = added
      .slice(0, Math.max(w2x, w4x))
      .map((e, i) => (i < w4x ? e : stripHq(e)));
    const cache: StvCache = {
      ver: 1,
      ids,
      total: added.length,
      w2x,
      w4x,
      done2x: w2x >= added.length,
      done4x: !!emoteHq && w4x >= added.length,
      emotes: list
    };
    if (cache.done2x && (!emoteHq || cache.done4x)) cache.at = Date.now();
    try {
      await chrome.storage.local.set({ [STV_CACHE_KEY]: cache });
    } catch (e) {
      /* quota failure must not affect the live session */
    }
  };

  const tick = (): void => {
    if (w2x < added.length) {
      w2x = Math.min(w2x + STV_CACHE_CHUNK, added.length);
    } else if (emoteHq && w4x < added.length) {
      w4x = Math.min(w4x + STV_CACHE_CHUNK, added.length);
      if (w4x >= added.length) {
        // 4x cache complete: cached emotes may render at 4x from now on.
        emoteHqReady = true;
        flipped = true;
      }
    }
    void persist().then(() => {
      if (flipped) {
        flipped = false;
        if (emoteHq) swapRenderedEmoteSrc();
      }
      const done = w2x >= added.length && (!emoteHq || w4x >= added.length);
      if (done) {
        writerTimer = undefined;
      } else {
        writerTimer = setTimeout(tick, STV_CACHE_TICK_MS);
      }
    });
  };

  writerTimer = setTimeout(tick, STV_CACHE_TICK_MS);
};

// Boot-time cache applies run while YouTube is still hydrating: building the
// regex and sweeping the whole document right away steals CPU from the page
// load, so defer one idle tick. A generation counter skips the deferred run
// when a synchronous apply (network fetch) has already superseded it.
let applyGen = 0;

const idleRun = (fn: () => void): void => {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, o?: { timeout?: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout: 1000 });
  else setTimeout(fn, 120);
};

const applyStvEmotes = (list: Emote[], defer = false): void => {
  const gen = ++applyGen;
  // Custom emotes win over cached 7TV entries with the same keyword.
  const customKeys = new Set(customEmotes.map((e) => e.keyword.toLowerCase()));
  sevenTvEmotes = list.filter(
    (e) => e && e.keyword && e.file && !customKeys.has(e.keyword.toLowerCase())
  );
  for (const e of sevenTvEmotes) {
    // Identity-register CDN urls so emoteSrc() resolves them; the cache
    // path never populates this map otherwise (the v1.0.86 bug).
    emoteUrls[e.file] = e.file;
    if (e.fileHq) emoteUrls[e.fileHq] = e.fileHq;
  }
  emotes = [...customEmotes, ...sevenTvEmotes];
  const run = (): void => {
    if (gen !== applyGen) return;
    buildPattern();
    document.dispatchEvent(new CustomEvent("ytccc-emotes-loaded"));
  };
  if (defer) idleRun(run);
  else run();
};

const load7tvEmotes = async (): Promise<void> => {
  let raw = "";
  try {
    const stored = (await chrome.storage.sync.get(["emoteSetIds", "emoteHq"])) as Record<string, unknown>;
    raw = String(stored.emoteSetIds || "");
    emoteHq = !!stored.emoteHq;
  } catch (e) {
    /* ignore */
  }
  const ids = ["global", ...parse7tvSetIds(raw)];

  // Cache-first: entries built from the same set ids apply instantly; a
  // stale-but-complete cache still renders while the refresh runs below.
  let cache: StvCache = {};
  try {
    const stored = (await chrome.storage.local.get(STV_CACHE_KEY)) as Record<string, unknown>;
    cache = (stored[STV_CACHE_KEY] || {}) as StvCache;
  } catch (e) {
    /* ignore */
  }
  const rawCached = Array.isArray(cache.emotes) ? cache.emotes : [];
  // Only entries of still-configured sets (global + current users) may
  // render or count: entries of REMOVED users would otherwise survive every
  // refresh and inflate the cache total.
  const configured = new Set(ids);
  const cachedEmotes = rawCached.filter(
    (e) => configured.has((e && (e as Emote).setId) || "global")
  );
  const idsMatch = JSON.stringify(cache.ids || []) === JSON.stringify(ids);
  if (idsMatch && cachedEmotes.length) {
    emoteHqReady = !!cache.done4x;
    applyStvEmotes(cachedEmotes, true);
    log("7tv emotes from cache:", cachedEmotes.length);
    const fresh =
      Number.isFinite(cache.at) &&
      Date.now() - (cache.at as number) < STV_CACHE_TTL &&
      !!cache.done2x &&
      (!emoteHq || !!cache.done4x) &&
      // A cache holding removed-set entries is never "fresh": the fetch +
      // writer rewrite below purges them.
      cachedEmotes.length === rawCached.length;
    if (fresh) return;
  } else {
    emoteHqReady = false;
  }

  const sets = await Promise.all(ids.map((id) => fetch7tvSet(id)));
  // Parse the fresh batch with batch-internal dedupe only: deduping against
  // the current emotes would let cached entries suppress their own fetched
  // twins, leaving nothing for the writer to finish the 4x pass with.
  const fetched: Emote[] = [];
  const batchKeys = new Set<string>();
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    // Remember which set each keyword came from so the emoji picker can
    // show the 7TV global list and per-user sets separately.
    const setId = ids[i] || "";
    if (!set || !Array.isArray(set.emotes)) continue;
    for (const rawEmote of set.emotes) {
      const o = rawEmote as { name?: string; data?: { host?: { url?: string; files?: Array<{ name?: string; format?: string }> } } };
      const name = o?.name || "";
      const url = o?.data?.host ? build7tvUrl(o.data.host) : null;
      if (!name || !url) continue;
      const key = name.toLowerCase();
      if (batchKeys.has(key)) continue;
      batchKeys.add(key);
      emoteUrls[url.low] = url.low;
      if (url.hq) emoteUrls[url.hq] = url.hq;
      fetched.push({ keyword: name, file: url.low, fileHq: url.hq || undefined, setId, source: "7tv" });
    }
  }
  // Nothing fetched (network down etc.): keep the already-applied cache and
  // its progress flags untouched instead of clobbering them with a rewrite.
  if (!fetched.length) return;
  // Merge for rendering: fetched entries win over cached twins; cached
  // entries fill whatever the fetch dropped this round (e.g. a failed set).
  const byKey = new Map<string, Emote>();
  for (const e of fetched) byKey.set(e.keyword.toLowerCase(), e);
  // Cache fill only from still-configured sets — removed users must not
  // resurrect their emotes here (the total stays global + current users).
  for (const e of sevenTvEmotes) {
    if (!configured.has(e.setId || "global")) continue;
    const k = e.keyword.toLowerCase();
    if (!byKey.has(k)) byKey.set(k, e);
  }
  const merged = Array.from(byKey.values());
  applyStvEmotes(merged);
  log("7tv emotes loaded:", merged.length, "(total:", emotes.length, ")");
  // Persist for the next page loads: 2x pass first, then the 4x pass. The
  // 2x pass is skipped when the cached list already matches the merged list
  // keyword-for-keyword (same sets, same order) — it resumes into the 4x
  // pass instead of being rewritten from scratch.
  lastAdded = merged;
  lastIds = ids;
  // Resume the passes from the persisted counters when the cached list is a
  // keyword-prefix of the merged list (same sets, same order): a partial 2x
  // or 4x pass continues where it stopped instead of rewriting from zero.
  const sameList =
    idsMatch &&
    cachedEmotes.length <= merged.length &&
    cachedEmotes.every((e, i) => e && e.keyword === merged[i].keyword);
  const prev2x =
    typeof cache.w2x === "number"
      ? Math.max(0, cache.w2x)
      : cache.done2x
        ? merged.length
        : 0;
  const prev4x = typeof cache.w4x === "number" ? Math.max(0, cache.w4x) : 0;
  const seed2x = sameList ? Math.min(prev2x, merged.length) : 0;
  const seed4x = sameList ? Math.min(prev4x, seed2x) : 0;
  startStvCacheWriter(merged, ids, seed2x, seed4x);
};

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.emoteSetIds) void load7tvEmotes();
  if (changes.emoteHq) {
    emoteHq = !!changes.emoteHq.newValue;
    swapRenderedEmoteSrc();
    // Turning 4x on mid-session: when the 2x pass is already cached and real
    // 4x urls are in memory, run the 4x cache pass right away.
    if (
      emoteHq &&
      lastAdded.length &&
      lastAdded.some((e) => e.fileHq) &&
      !writerTimer
    ) {
      startStvCacheWriter(lastAdded, lastIds.length ? lastIds : ["global"], lastAdded.length);
    }
  }
});

export const getEmotes = (): Emote[] => emotes;
export const getCustomEmotes = (): Emote[] => customEmotes;

export const emoteSrc = (emote: Emote | null | undefined): string => {
  if (!emote || !emote.file) return "";
  const f = emoteHq && emoteHqReady && emote.fileHq ? emote.fileHq : emote.file;
  return emoteUrls[f] || "";
};

// The sweep cannot rebuild messages that are already rendered as <img>
// (the keyword text was replaced), so a HQ switch swaps the src attribute
// directly. The observer watches childList only — attribute changes never
// re-enter it, so there is no loop risk.
const swapRenderedEmoteSrc = (): void => {
  // Poll labels use the CSS-static path and hold no <img>: their emote URL
  // lives in the --ytccc-emote variable on the marked element, so a HQ
  // switch must refresh those variables directly.
  document.querySelectorAll<HTMLElement>("[data-ytccc-emote]").forEach((el) => {
    const kw = emoteKeywordMap.get((el.textContent || "").trim().toLowerCase());
    const src = kw ? emoteSrc(kw) : "";
    if (src) el.style.setProperty("--ytccc-emote", `url("${src}")`);
  });
  const map = new Map<string, string>();
  for (const e of emotes) {
    if (!e.fileHq) continue;
    map.set(emoteHq ? e.file : e.fileHq, emoteHq ? e.fileHq : e.file);
  }
  if (!map.size) return;
  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const next = map.get(img.getAttribute("src") || "");
    if (next) img.src = next;
  });
};

export const applyEmotes = (el: HTMLElement): void => {
  // Chat messages wrap their text in #message; comment / community-post
  // bodies ARE the #content-text element themselves; poll cards process
  // their entire text content.
  let message: HTMLElement | null;
  if (el.matches("#content-text")) message = el;
  else if (el.matches(POLL_SELECTOR)) message = el;
  else if (el.matches("#message")) message = el;
  else message = el.querySelector("#message");
  if (!message || !emotePattern) return;
  // Poll summary ("viewer engagement") messages: only the question title
  // line (bold span) gets emotes — answer lines ("label (12%)") and the
  // ended footer stay plain text.
  const engagement = !!message.closest(
    "yt-live-chat-viewer-engagement-message-renderer"
  );

  const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (engagement) {
      const p = node.parentElement;
      if (!p || !p.matches || !p.matches('[style-target="bold"]')) continue;
    }
    const val = node.nodeValue || "";
    // Hidden text (\u200b) next to rendered emotes must be skipped to avoid
    // re-processing loops on every sweep (freeze cause with many emotes).
    if (val.includes("\u200b")) continue;
    // Fast check: only run the heavy regex when a known keyword is present.
    let cheapHit = false;
    for (const w of val.split(/\s+/)) {
      if (w && emoteKeywordSet.has(w.toLowerCase())) {
        cheapHit = true;
        break;
      }
    }
    if (!cheapHit) continue;
    emotePattern.lastIndex = 0;
    if (emotePattern.test(val)) targets.push(node);
  }
  if (!targets.length) return;

  for (const node of targets) {
    const text = node.nodeValue || "";
    const frag = document.createDocumentFragment();
    let last = 0;
    emotePattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = emotePattern.exec(text)) !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      const hit = emoteKeywordMap.get(m[0].toLowerCase());
      const src = emoteSrc(hit);
      if (hit && src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = m[0];
        img.title = m[0];
        img.style.cssText =
          "display:inline-block;vertical-align:middle;height:1.4em;max-width:6em;margin:0 2px;border-radius:2px;";
        frag.appendChild(img);
      } else {
        frag.appendChild(document.createTextNode(m[0]));
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    node.parentNode!.replaceChild(frag, node);
  }
};

// Poll cards are re-rendered/restored by YouTube constantly, so processing
// must be idempotent AND free of childList mutations — inserting img/span
// pairs made YouTube's Polymer re-renders and our sweeps fight each other,
// which flickered (raw label → emote → empty). The static strategy marks
// the label's PARENT element instead: the keyword text stays where Polymer
// put it (hidden by CSS) and the emote is painted via ::before, so even a
// full YouTube re-render of the label keeps looking the same.
const ensurePollEmoteStyle = (): void => {
  if (document.getElementById("ytccc-poll-emote-style")) return;
  const style = document.createElement("style");
  style.id = "ytccc-poll-emote-style";
  style.textContent =
    "[data-ytccc-emote]{color:transparent!important;font-size:0!important;}" +
    "[data-ytccc-emote]::before{content:\"\"!important;display:inline-block!important;" +
    "width:18px!important;height:18px!important;vertical-align:middle!important;" +
    "margin:0 2px!important;border-radius:2px!important;" +
    "background:var(--ytccc-emote) center/contain no-repeat!important;}";
  (document.head || document.documentElement).appendChild(style);
};

const markPollEmote = (el: HTMLElement, src: string): void => {
  el.dataset.ytcccEmote = "1";
  el.style.setProperty("--ytccc-emote", `url("${src}")`);
};

const clearPollEmoteMarks = (card: HTMLElement): void => {
  card.querySelectorAll<HTMLElement>("[data-ytccc-emote]").forEach((el) => {
    el.style.removeProperty("--ytccc-emote");
    delete el.dataset.ytcccEmote;
  });
};

const isPollEmoteMarked = (parent: Element | null): boolean =>
  !!(parent && (parent as HTMLElement).dataset &&
    ((parent as HTMLElement).dataset.ytcccEmote ||
      (parent as HTMLElement).dataset.ytcccPollSrc));

const unwrapPollKeep = (card: HTMLElement): void => {
  card
    .querySelectorAll<HTMLElement>("span[data-ytccc-poll-src]")
    .forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      span.remove();
    });
};

const isConvertibleTextNode = (node: Text): boolean => {
  const val = node.nodeValue || "";
  if (val.includes("\u200b")) return false;
  let cheapHit = false;
  for (const w of val.split(/\s+/)) {
    if (w && emoteKeywordSet.has(w.toLowerCase())) {
      cheapHit = true;
      break;
    }
  }
  if (!cheapHit) return false;
  emotePattern!.lastIndex = 0;
  return emotePattern!.test(val);
};

const pollCardCanonical = (card: HTMLElement): boolean => {
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    // Converted labels (CSS mark or legacy keep-span) never count as raw
    // text — Polymer may rewrite them freely while they stay invisible.
    if (isPollEmoteMarked(parent)) continue;
    if (isConvertibleTextNode(node)) return false;
  }
  return true;
};

export const applyPollEmotes = (card: HTMLElement): void => {
  if (!emotePattern) return;
  ensurePollEmoteStyle();
  // Strip emote images left by older content-script instances (extension
  // reload without a page refresh keeps them running) — ours are marked
  // with data-ytccc-poll and handled below; legacy unmarked ones die here.
  card.querySelectorAll("img").forEach((img) => {
    if (img.dataset && img.dataset.ytcccPoll) return;
    const alt = (img.getAttribute("alt") || "").toLowerCase();
    const title = (img.getAttribute("title") || "").toLowerCase();
    if ((alt && emoteKeywordSet.has(alt)) || (title && emoteKeywordSet.has(title))) {
      img.remove();
    }
  });
  // Ended polls (option text inlines the percentage, e.g. "label (12%)")
  // are always restored to plain text.
  if (/\(\d+(?:\.\d+)?%\)/.test(card.textContent || "")) {
    clearPollEmoteMarks(card);
    if (card.querySelector("img[data-ytccc-poll], span[data-ytccc-poll-src]")) {
      unwrapPollKeep(card);
      card
        .querySelectorAll<HTMLElement>("img[data-ytccc-poll]")
        .forEach((img) => img.remove());
    }
    return;
  }
  // Already canonical: every keyword is an emote, nothing to do (no DOM
  // mutation, so the observer can never react to us).
  if (pollCardCanonical(card)) return;

  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    // Same skip as the canonical check: text inside a converted (marked or
    // keep-span) label must never be re-converted — re-nesting here is what
    // made poll emotes multiply on every YouTube update.
    if (isPollEmoteMarked(node.parentElement)) continue;
    if (isConvertibleTextNode(node)) targets.push(node);
  }
  if (!targets.length) return;

  const pollImgStyle =
    "display:inline-block;vertical-align:middle;height:1.4em;max-width:6em;margin:0 2px;border-radius:2px;";
  for (const node of targets) {
    const parent = node.parentElement;
    if (!parent) continue;
    // Marked label: converted — just refresh the CSS var if the emote URL
    // changed (HQ toggle / emote reload). Attribute-only, never flickers.
    if (parent.dataset.ytcccEmote) {
      const cur = emoteKeywordMap.get((parent.textContent || "").trim().toLowerCase());
      const curSrc = cur ? emoteSrc(cur) : "";
      if (curSrc) markPollEmote(parent, curSrc);
      continue;
    }
    if (parent.dataset.ytcccPollSrc) continue;
    const text = node.nodeValue || "";
    const kw = emoteKeywordMap.get(text.trim().toLowerCase());
    const src = emoteSrc(kw);
    // YouTube's poll updater sometimes appends a duplicate label text node
    // next to an already converted pair — drop the redundant copy instead
    // of stacking another emote image.
    let prev = node.previousSibling;
    let duplicate = false;
    while (prev) {
      const el = prev as HTMLElement;
      if (el.dataset && el.dataset.ytcccPoll) {
        // Raw text can land between the img and its keep-span (YouTube
        // re-inserts label text), so scan forward past plain text nodes
        // until the paired keep-span is found.
        let fwd = el.nextSibling;
        while (fwd) {
          const fe = fwd as HTMLElement;
          if (fe.dataset && fe.dataset.ytcccPollSrc) {
            if (
              (fe.textContent || "").trim().toLowerCase() ===
              text.trim().toLowerCase()
            ) {
              duplicate = true;
            }
            break;
          }
          fwd = fwd.nextSibling;
        }
        break;
      }
      prev = prev.previousSibling;
    }
    if (duplicate) {
      node.remove();
      continue;
    }
    if (
      kw &&
      src &&
      text.trim() === text &&
      (parent.textContent || "").trim().toLowerCase() === text.trim().toLowerCase()
    ) {
      // Static CSS path: the parent holds ONLY this keyword, so hide the
      // (Polymer-owned) text via the mark and paint the emote with ::before.
      // No childList mutation — YouTube's re-renders cannot fight us.
      markPollEmote(parent, src);
      continue;
    }
    if (kw && src && text.trim() === text) {
      // Legacy fallback for labels whose parent holds extra content: keep
      // the live text node (Polymer may keep writing to it) hidden inside a
      // zero-size span.
      const span = document.createElement("span");
      span.dataset.ytcccPollSrc = "1";
      span.style.cssText =
        "display:inline-block;width:0;height:0;overflow:hidden;opacity:0;font-size:0;";
      parent.insertBefore(span, node);
      span.appendChild(node);
      const img = document.createElement("img");
      img.src = src;
      img.alt = kw.keyword;
      img.title = kw.keyword;
      img.dataset.ytcccPoll = "1";
      img.style.cssText = pollImgStyle;
      span.parentNode!.insertBefore(img, span);
    } else {
      // Mixed / multi-keyword text: replace with a fragment; the matched
      // keyword text is kept in a hidden span so a later restore works.
      const frag = document.createDocumentFragment();
      let last = 0;
      emotePattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = emotePattern.exec(text)) !== null) {
        if (m.index > last) {
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        }
        const hit = emoteKeywordMap.get(m[0].toLowerCase());
        const hitSrc = emoteSrc(hit);
        if (hit && hitSrc) {
          const img = document.createElement("img");
          img.src = hitSrc;
          img.alt = m[0];
          img.title = m[0];
          img.dataset.ytcccPoll = "1";
          img.style.cssText = pollImgStyle;
          const keep = document.createElement("span");
          keep.style.display = "none";
          keep.dataset.ytcccPollSrc = "1";
          keep.textContent = m[0];
          frag.appendChild(img);
          frag.appendChild(keep);
        } else {
          frag.appendChild(document.createTextNode(m[0]));
        }
        last = m.index + m[0].length;
      }
      if (last < text.length) {
        frag.appendChild(document.createTextNode(text.slice(last)));
      }
      node.parentNode!.replaceChild(frag, node);
    }
  }
};
