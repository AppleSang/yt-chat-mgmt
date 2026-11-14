import { getEmotes, emoteSrc } from "./emotes";
import { t } from "../language/i18n";
import { log } from "./logger";
import type { Emote } from "../language/types";

type Field = HTMLElement & { dataset: DOMStringMap };

let lastField: Field | null = null;

export const getInputField = (): Field | null => {
  // Renderer-scoped editable first: the chat field is a contenteditable
  // descendant of yt-live-chat-message-input-renderer. Any-value matches are
  // accepted because the real DOM may use plaintext-only or an empty value.
  const renderer = document.querySelector("yt-live-chat-message-input-renderer");
  const editable = renderer
    ? (renderer.querySelector(
        "[contenteditable]:not([contenteditable='false'])"
      ) as Field | null)
    : null;
  if (editable) return editable;
  const loose =
    (document.querySelector("#textbox") as Field | null) ||
    (document.querySelector("#input") as Field | null);
  // Only accept loose matches that are actually editable, so a random
  // #input/#textbox wrapper elsewhere never hijacks insertion.
  return loose && loose.isContentEditable ? loose : null;
};

const stripInvisibleTail = (s: string | null): string =>
  (s || "").replace(/[\u200b-\u200f\u202a-\u202e\ufeff\u00a0\s]+$/, "");

const placeCaretEnd = (field: Field): void => {
  const range = document.createRange();
  range.selectNodeContents(field);
  range.collapse(false);
  const sel = window.getSelection();
  sel!.removeAllRanges();
  sel!.addRange(range);
};

// Emote display in the input: visible image + the raw keyword kept in the
// DOM (1px, transparent) so YouTube still reads/send the plain text. The
// keyword span is class-styled so the injected stylesheet can keep it
// invisible even when selected (plain color:transparent is overridden by
// the UA selection colors, which painted it as a dash on Ctrl+A).
const buildEmoteFrag = (kw: Emote, addSpace: boolean): DocumentFragment => {
  const frag = document.createDocumentFragment();
  const img = document.createElement("img");
  img.src = emoteSrc(kw);
  img.alt = kw.keyword;
  img.dataset.ytcccKeyword = kw.keyword;
  img.style.cssText =
    "display:inline-block;vertical-align:middle;height:1.4em;max-width:6em;margin:0 2px;border-radius:3px;";
  frag.appendChild(img);
  const hidden = document.createElement("span");
  hidden.className = "ytccc-emote-t";
  hidden.textContent = "\u200b" + kw.keyword + "\u200b";
  frag.appendChild(hidden);
  if (addSpace) frag.appendChild(document.createTextNode("\u00A0"));
  return frag;
};

export const insertEmote = (keyword: string): void => {
  const field = lastField || getInputField();
  if (!field) return;
  markEmoteField(field);
  const kw = getEmotes().find(
    (e) => e.keyword.toLowerCase() === keyword.toLowerCase()
  );
  if (!kw || !emoteSrc(kw)) return;

  try {
    const sel = window.getSelection();
    if (
      sel &&
      sel.isCollapsed &&
      sel.anchorNode &&
      sel.anchorNode.nodeType === Node.TEXT_NODE &&
      field.contains(sel.anchorNode)
    ) {
      const anchor = sel.anchorNode as Text;
      const before = (anchor.nodeValue || "").slice(0, sel.anchorOffset);
      const m = before.match(/\|[^\s|]*$/);
      const range = document.createRange();
      // Replace the "|query" token when present, else insert at the caret.
      if (m) range.setStart(anchor, sel.anchorOffset - m[0].length);
      else range.setStart(anchor, sel.anchorOffset);
      range.setEnd(anchor, sel.anchorOffset);
      range.deleteContents();
      range.insertNode(buildEmoteFrag(kw, true));
      placeCaretEnd(field);
      field.focus();
      return;
    }
  } catch (e) {
    /* ignore */
  }
  // Fallback: rebuild the field content from scratch.
  const current = stripInvisibleTail(field.textContent || "");
  const m2 = current.match(/\|([^\s|]*)$/);
  const base = m2 ? current.slice(0, current.length - m2[0].length) : current;
  field.textContent = base;
  field.appendChild(buildEmoteFrag(kw, true));
  placeCaretEnd(field);
  field.focus();
};

// Panel / search-result clicks insert the raw keyword as PLAIN TEXT instead
// of an inline image: the text is what YouTube's own send model reliably
// reads, and it renders as the emote in the sent message exactly like a
// hand-typed trigger (bare keyword â€” the same thing flushEmoteField leaves
// behind before sending). A trailing space keeps rapid clicks as separate
// emotes instead of one glued keyword.
const insertEmoteText = (keyword: string): void => {
  const field = lastField || getInputField();
  if (!field || !keyword) return;
  markEmoteField(field);
  const text = keyword + " ";
  const sel = window.getSelection();
  const anchor =
    sel &&
    sel.isCollapsed &&
    sel.anchorNode &&
    sel.anchorNode.nodeType === Node.TEXT_NODE &&
    field.contains(sel.anchorNode)
      ? (sel.anchorNode as Text)
      : null;
  if (anchor) {
    const val = anchor.nodeValue || "";
    const off = sel!.anchorOffset;
    // Complete a trailing "|query" token (suggest flow) instead of stacking.
    const m = val.slice(0, off).match(/\|[^\s|]*$/);
    const at = m ? off - m[0].length : off;
    anchor.insertData(at, text);
  } else {
    // Append at the end, completing a trailing "|query" token if the last
    // text node carries one; existing content (spaces included) stays put.
    const node = lastTextNode(field);
    if (node) {
      const val = node.nodeValue || "";
      const m2 = val.match(/\|[^\s|]*$/);
      if (m2) node.nodeValue = val.slice(0, val.length - m2[0].length);
    }
    field.appendChild(document.createTextNode(text));
  }
  // YouTube builds its send model from input events â€” dispatch a synthetic
  // one (ignored by our handlers via `flushing`) so the text registers, and
  // only then park the caret at the end so the next click keeps appending.
  flushing = true;
  try {
    field.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true })
    );
  } catch {
    /* older browsers: ignore */
  }
  flushing = false;
  skipRestore = true;
  try {
    placeCaretEnd(field);
    field.focus();
  } finally {
    skipRestore = false;
  }
};

// ---------- Emoji catalog injection ----------

const catalogBound = new WeakSet<Element>();

const findPicker = (): Element | null =>
  document.querySelector("yt-live-chat-emoji-picker-renderer") ||
  document.querySelector("yt-emoji-picker-renderer") ||
  document.querySelector("tp-yt-emoji-picker-renderer") ||
  document.querySelector("[emoji-picker], #emoji-picker");

const findPickerContainer = (picker: Element): Element | null => {
  // New-style picker: category renderers are direct children of the scroll
  // list, so their parent is the safest home for injected sections.
  const firstCat = picker.querySelector(
    "yt-emoji-picker-category-renderer, tp-yt-emoji-picker-category, .emoji-category"
  );
  if (firstCat && firstCat.parentElement) return firstCat.parentElement;
  const firstEmoji = picker.querySelector(
    "tp-yt-emoji, yt-emoji-picker-emoji-renderer, [data-emoji-id], .emoji"
  );
  if (firstEmoji && firstEmoji.parentElement) {
    return firstEmoji.parentElement.parentElement || firstEmoji.parentElement;
  }
  for (const sel of [
    "#picker-items",
    "#emoji-picker-items",
    "tp-yt-paper-listbox#items",
    "#items",
    "tp-yt-paper-listbox",
    "#content",
    "#picker"
  ]) {
    const c = picker.querySelector(sel);
    if (c) return c;
  }
  return null;
};

// The picker's own search box: the first text-like <input> inside it.
const findSearchInput = (picker: Element): HTMLInputElement | null => {
  for (const el of Array.from(picker.querySelectorAll("input"))) {
    const input = el as HTMLInputElement;
    const type = (input.getAttribute("type") || "").toLowerCase();
    if (!type || type === "text" || type === "search") return input;
  }
  return null;
};

// ---------- 7TV picker entries: category icon + added-user avatars ----------

interface StvUserLite {
  id: string;
  name: string;
  avatar: string;
  setIds: string[];
}

type StvSource = { kind: "global" } | { kind: "user"; id: string };

let stvUsers: StvUserLite[] = [];
let stvActive: StvSource = { kind: "global" };
let stvPanelOpen = false;
let stvSearch = "";
const rowBound = new WeakSet<Element>();
const searchBound = new WeakSet<HTMLInputElement>();

const loadStvUsers = async (): Promise<void> => {
  try {
    const stored = (await chrome.storage.sync.get("emoteUsers")) as Record<string, unknown>;
    const users = Array.isArray(stored.emoteUsers)
      ? (stored.emoteUsers as StvUserLite[])
      : [];
    stvUsers = users.filter((u) => u && u.id);
  } catch (e) {
    stvUsers = [];
  }
};

// The category icon row sits above the emoji grid. Real DOM:
// yt-emoji-picker-renderer > #category-buttons > yt-emoji-picker-category-
// button-renderer (first = member â˜…, then YouTube â–¶, ...).
const findCategoryRow = (picker: Element): Element | null => {
  for (const sel of ["#category-buttons", "#categories", "#emoji-categories"]) {
    const r = picker.querySelector(sel);
    if (r && r.children.length >= 2) return r;
  }
  const firstCat = picker.querySelector(
    "yt-emoji-picker-category-button-renderer, tp-yt-emoji-category-button, .emoji-category-button"
  );
  if (
    firstCat &&
    firstCat.parentElement &&
    firstCat.parentElement.children.length >= 2
  ) {
    return firstCat.parentElement;
  }
  return null;
};

const ensureStvStyle = (): void => {
  if (document.getElementById("ytccc-stv-picker-style")) return;
  const style = document.createElement("style");
  style.id = "ytccc-stv-picker-style";
  // Hover uses a stylesheet rule so the active highlight (inline style)
  // always wins over it.
  style.textContent =
    ".ytccc-stv-cat:hover,.ytccc-stv-avatar:hover,.ytccc-stv-emoji:hover{background:rgba(255,255,255,0.1);}";
  (document.head || document.documentElement).appendChild(style);
};

// Official 7TV mark (paths taken verbatim from https://7tv.app/favicon.svg).
// ViewBox is cropped to the glyph bounds (x 8..116.148, y 24..104) â€” the raw
// favicon has 24/128 units of transparent padding around it, which rendered
// the mark visibly smaller than YouTube's own 24px category icons. Fill is
// hardcoded white per design decision (picker surface is always dark).
const STV_ICON_SVG =
  '<svg viewBox="8 24 108.148 80" width="24" height="24" fill="white" aria-hidden="true" focusable="false">' +
  '<path d="M90.986 45.953L95.9196 37.3498L98.584 32.801L93.65 24.1978V24H67.3036L77.1712 41.2064L79.9344 45.953H90.986Z"/>' +
  '<path d="M36.6158 103.703L66.2184 52.0842L69.8692 45.7554L60.0016 28.549L57.2388 24.099H15.598L10.6642 32.7022L8 37.251L12.9338 45.8542V46.052H44.5098L19.841 89.068L16.3874 95.1992L21.3212 103.802V104H36.6158"/>' +
  '<path d="M77.862 103.703H92.9592L112.694 69.29L116.148 63.357L111.214 54.7538V54.556H96.0184L86.1508 71.7624L85.46 73.048L75.5924 55.8415L74.902 54.556L65.0344 71.7624L62.2716 76.5088L77.0728 102.318L77.862 103.703Z"/>' +
  "</svg>";

const makeStvCatButton = (size = 36): HTMLElement => {
  const btn = document.createElement("div");
  btn.className = "ytccc-stv-cat";
  btn.setAttribute("role", "button");
  btn.title = "7TV";
  // Icon fill stays white (picker is always dark). align-self/vertical-align
  // keep the button on the row's centre line in any layout the row uses.
  btn.style.cssText =
    "display:flex;align-items:center;justify-content:center;width:" +
    size +
    "px;height:" +
    size +
    "px;border-radius:50%;cursor:pointer;flex-shrink:0;align-self:center;vertical-align:middle;";
  btn.dataset.ytcccSize = String(size);
  btn.innerHTML = STV_ICON_SVG;
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  btn.addEventListener("click", onStvButtonClick);
  return btn;
};

const makeStvAvatarButton = (u: StvUserLite, size = 36): HTMLElement => {
  const btn = document.createElement("div");
  btn.className = "ytccc-stv-avatar";
  btn.dataset.ytcccAvatar = u.id;
  btn.setAttribute("role", "button");
  btn.title = u.name;
  btn.style.cssText =
    "display:flex;align-items:center;justify-content:center;width:" +
    size +
    "px;height:" +
    size +
    "px;border-radius:50%;overflow:hidden;cursor:pointer;flex-shrink:0;background:rgba(255,255,255,0.08);align-self:center;vertical-align:middle;";
  btn.dataset.ytcccSize = String(size);
  const img = document.createElement("img");
  img.src = u.avatar || "";
  img.alt = u.name;
  img.loading = "lazy";
  img.style.cssText = "width:24px;height:24px;object-fit:cover;border-radius:50%;";
  btn.appendChild(img);
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  btn.addEventListener("click", onStvButtonClick);
  return btn;
};

// Our controls live INSIDE #category-buttons, appended AFTER the last
// Polymer-stamped button â€” outside the dom-repeat's managed range, which is
// what made the 1.0.79 mid-row insertion corrupt rendering. Buttons are only
// re-pinned when actually missing, so steady-state injects mutate nothing.
const ensureStvButtons = (row: Element): void => {
  ensureStvStyle();
  const parent = row.parentElement;
  if (!parent) return;
  // Companion rows / grid sections left by older versions die here.
  parent.querySelectorAll(":scope > .ytccc-stv-row").forEach((n) => n.remove());
  findPicker()
    ?.querySelectorAll(".ytccc-stv-section")
    .forEach((n) => n.remove());
  // Match YouTube's own category-button box so our icons line up exactly
  // (an oversized button stretched the row and pushed our icons low); 36 is
  // the fallback while the picker has not been laid out yet.
  const sample = row.querySelector(
    "yt-emoji-picker-category-button-renderer, tp-yt-emoji-category-button, .emoji-category-button"
  );
  const measured = sample ? Math.round(sample.getBoundingClientRect().height) : 0;
  const size = measured > 0 && measured < 100 ? measured : 36;
  const applySize = (el: HTMLElement): void => {
    if (el.dataset.ytcccSize === String(size)) return;
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.dataset.ytcccSize = String(size);
  };
  let cat = row.querySelector<HTMLElement>(":scope > .ytccc-stv-cat");
  if (!cat) {
    cat = makeStvCatButton(size);
    row.appendChild(cat);
  } else {
    applySize(cat);
  }
  // The signature check rebuilds the avatar tail only when the user list
  // changed â€” or when a re-render dropped some of them.
  const sig = stvUsers.map((u) => u.id).join(",");
  const avatars = row.querySelectorAll(":scope > .ytccc-stv-avatar");
  if (
    (row as HTMLElement).dataset.ytcccAvatarSig !== sig ||
    avatars.length !== stvUsers.length
  ) {
    (row as HTMLElement).dataset.ytcccAvatarSig = sig;
    row.querySelectorAll(":scope > .ytccc-stv-avatar").forEach((n) => n.remove());
    stvUsers.forEach((u) => row.appendChild(makeStvAvatarButton(u, size)));
  }
  row.querySelectorAll<HTMLElement>(":scope > .ytccc-stv-avatar").forEach(applySize);
  // The emote panel is a sibling of the row (never a child of it), with its
  // own scroll container so wheel scrolling never depends on picker internals.
  let panel = parent.querySelector<HTMLElement>(":scope > .ytccc-stv-panel");
  if (!panel) {
    // A missing panel means a fresh picker instance (closed/re-created, e.g.
    // after sending). Start in the stock state so the panel never auto-reopens
    // and its grid never visibly "reloads" right after a send.
    stvPanelOpen = false;
    stvSearch = "";
    panel = document.createElement("div");
    panel.className = "ytccc-stv-panel";
    panel.style.cssText =
      "display:none;max-height:280px;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.08);padding:8px 8px 4px;";
    parent.insertBefore(panel, row.nextSibling);
  }
};

const stvPanelEmotes = (): Emote[] => {
  const all = getEmotes().filter((e) => e.source === "7tv");
  // Local alias: narrowing a mutable module variable inside a callback fails.
  const active = stvActive;
  if (active.kind === "global") {
    return all.filter((e) => (e.setId || "global") === "global");
  }
  const u = stvUsers.find((x) => x.id === active.id);
  const ids = u ? u.setIds : [];
  return all.filter((e) => ids.includes(e.setId || ""));
};

const refreshStvHighlight = (): void => {
  document.querySelectorAll<HTMLElement>(".ytccc-stv-cat").forEach((b) => {
    b.style.background =
      stvPanelOpen && stvActive.kind === "global" ? "rgba(138,180,248,0.18)" : "";
  });
  document.querySelectorAll<HTMLElement>(".ytccc-stv-avatar").forEach((b) => {
    b.style.background =
      stvPanelOpen && stvActive.kind === "user" && b.dataset.ytcccAvatar === stvActive.id
        ? "rgba(138,180,248,0.18)"
        : "";
  });
};

const renderStvPanel = (): void => {
  const picker = findPicker();
  if (!picker) return;
  const panel = picker.querySelector<HTMLElement>(".ytccc-stv-panel");
  if (!panel) return;
  // An active search query forces the panel open and switches it to a
  // results list; without one the panel obeys the toggle state.
  const q = stvSearch.toLowerCase();
  const open = stvPanelOpen || !!q;
  panel.style.display = open ? "" : "none";
  refreshStvHighlight();
  if (!open) return;
  let list: Emote[];
  let title: string;
  if (q) {
    list = getEmotes().filter(
      (e) => e.source === "7tv" && e.keyword.toLowerCase().includes(q)
    );
    title = t("pickerStvSearch");
  } else {
    list = stvPanelEmotes();
    const active = stvActive;
    const activeUser =
      active.kind === "user" ? stvUsers.find((u) => u.id === active.id) : null;
    title = activeUser ? activeUser.name : t("pickerStvGlobal");
  }
  const sig = `${q}|${title}:${list.length}:${list[0]?.keyword || ""}:${
    list[list.length - 1]?.keyword || ""
  }`;
  if (panel.dataset.sig !== sig) {
    panel.dataset.sig = sig;
    panel.textContent = "";
    const head = document.createElement("div");
    head.textContent = title;
    head.style.cssText =
      "color:#e8eaed;font-size:13px;font-weight:500;padding:0 0 6px 2px;";
    panel.appendChild(head);
    const grid = document.createElement("div");
    grid.style.cssText = "display:flex;flex-wrap:wrap;gap:2px;";
    for (const em of list) {
      const item = document.createElement("div");
      item.className = "ytccc-stv-emoji";
      item.dataset.keyword = em.keyword;
      item.title = `|${em.keyword}`;
      item.style.cssText =
        "width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;";
      const img = document.createElement("img");
      img.src = emoteSrc(em);
      img.alt = em.keyword;
      img.loading = "lazy";
      img.style.cssText = "width:24px;height:24px;object-fit:contain;";
      item.appendChild(img);
      grid.appendChild(item);
    }
    panel.appendChild(grid);
    if (!list.length) {
      const empty = document.createElement("div");
      empty.textContent = t("pickerStvNoResults");
      empty.style.cssText = "color:#9aa0a6;font-size:12px;padding:4px 2px 8px;";
      panel.appendChild(empty);
    }
  }
};

// Our buttons sit among YouTube's category buttons; each handles its own
// click (stopPropagation keeps YouTube's row handlers out). Browsing a
// category also ends search mode.
const onStvButtonClick = (e: Event): void => {
  e.preventDefault();
  e.stopPropagation();
  const btn = e.currentTarget as HTMLElement;
  if (btn.classList.contains("ytccc-stv-avatar")) {
    const id = btn.dataset.ytcccAvatar || "";
    if (stvPanelOpen && stvActive.kind === "user" && stvActive.id === id) {
      stvPanelOpen = false;
    } else {
      stvActive = { kind: "user", id };
      stvPanelOpen = true;
    }
  } else {
    if (stvPanelOpen && stvActive.kind === "global" && !stvSearch) {
      stvPanelOpen = false;
    } else {
      stvActive = { kind: "global" };
      stvPanelOpen = true;
    }
  }
  stvSearch = "";
  const picker = findPicker();
  const input = picker ? findSearchInput(picker) : null;
  if (input && input.value) {
    input.value = "";
    // Let YouTube's own search handler reset its results grid as well.
    try {
      input.dispatchEvent(
        new InputEvent("input", { bubbles: true, composed: true })
      );
    } catch {
      /* older browsers: ignore */
    }
  }
  renderStvPanel();
};

// Clicking any of YouTube's own category buttons closes our panel so the
// picker behaves stock; our buttons run their own handlers first.
const onRowCaptureClick = (e: Event): void => {
  const t0 = e.target as HTMLElement;
  if (t0 && typeof t0.closest === "function") {
    if (t0.closest(".ytccc-stv-cat, .ytccc-stv-avatar")) return;
  }
  if (stvPanelOpen) {
    stvPanelOpen = false;
    renderStvPanel();
  }
};

const injectStvIntoPicker = (picker: Element): void => {
  const row = findCategoryRow(picker);
  if (!row) return;
  ensureStvButtons(row);
  if (!rowBound.has(row)) {
    rowBound.add(row);
    row.addEventListener("click", onRowCaptureClick, true);
  }
  // Wire the picker's search box to filter our 7TV emotes.
  const input = findSearchInput(picker);
  if (input && !searchBound.has(input)) {
    searchBound.add(input);
    input.addEventListener("input", () => {
      stvSearch = (input.value || "").trim();
      renderStvPanel();
    });
  }
  renderStvPanel();
};

export const injectIntoCatalog = (): void => {
  const picker = findPicker();
  if (!picker) return;

  const container = findPickerContainer(picker);
  if (!container) return;

  if (!catalogBound.has(picker)) {
    picker.addEventListener("mousedown", (e) => {
      const item = (e.target as HTMLElement).closest?.(".ytccc-stv-emoji");
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      insertEmoteText((item as HTMLElement).dataset.keyword || "");
    });
    catalogBound.add(picker);
  }

  // Sections left by older versions (custom-emote catalog) die here.
  container.querySelectorAll(".ytccc-catalog-section").forEach((n) => n.remove());

  injectStvIntoPicker(picker);
};

// ---------- Suggest picker ----------

let pickerEl: HTMLElement | null = null;
let pickerItems: { keyword: string }[] = [];
let pickerIndex = 0;

const closePicker = (): void => {
  if (pickerEl) {
    pickerEl.remove();
    pickerEl = null;
  }
  pickerItems = [];
  pickerIndex = 0;
};

const lastTextNode = (field: Field): Text | null => {
  let last: Text | null = null;
  const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) last = walker.currentNode as Text;
  return last;
};

const isTailAfterEmoteImg = (field: Field): boolean => {
  const n = lastTextNode(field);
  const prev = n && n.previousSibling;
  return !!(
    prev &&
    (prev as HTMLElement).tagName === "IMG" &&
    (prev as HTMLElement).dataset &&
    (prev as HTMLElement).dataset.ytcccKeyword
  );
};

const positionPicker = (field: Field | null): void => {
  if (!pickerEl || !field || !field.getBoundingClientRect) return;
  const rect = field.getBoundingClientRect();
  pickerEl.style.left = Math.max(8, rect.left) + "px";
  pickerEl.style.top = Math.max(8, rect.top - 8) + "px";
};

const highlightPicker = (): void => {
  if (!pickerEl) return;
  Array.from(pickerEl.children).forEach((child, i) => {
    (child as HTMLElement).style.background =
      i === pickerIndex ? "rgba(138, 180, 248, 0.18)" : "transparent";
  });
};

const renderPicker = (field: Field, matches: { keyword: string }[]): void => {
  if (!matches.length) {
    closePicker();
    return;
  }
  pickerItems = matches;
  pickerIndex = 0;
  if (!pickerEl) {
    pickerEl = document.createElement("div");
    pickerEl.id = "ytccc-emote-picker";
    pickerEl.style.cssText =
      "position:fixed;z-index:2147483647;background:#202124;border:1px solid #3c4043;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.5);padding:6px;display:flex;flex-direction:column;gap:2px;transform:translateY(-100%);max-width:280px;font-family:Roboto,Arial,sans-serif;";
    document.body.appendChild(pickerEl);
    pickerEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = (e.target as HTMLElement).closest?.("[data-keyword]");
      if (item) insertEmote((item as HTMLElement).dataset.keyword || "");
      closePicker();
    });
  } else {
    pickerEl.textContent = "";
  }
  matches.forEach((emote) => {
    const item = document.createElement("div");
    item.dataset.keyword = emote.keyword;
    item.style.cssText =
      "display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;cursor:pointer;color:#e8eaed;font-size:13px;";
    const img = document.createElement("img");
    img.src = emoteSrc(emote as never);
    img.alt = "";
    img.style.cssText =
      "width:22px;height:22px;object-fit:contain;border-radius:3px;flex-shrink:0;";
    const label = document.createElement("span");
    label.textContent = emote.keyword;
    item.appendChild(img);
    item.appendChild(label);
    pickerEl!.appendChild(item);
  });
  positionPicker(field);
  highlightPicker();
};

const updatePickerFromField = (field: Field | null): void => {
  if (!field) return;
  if (isTailAfterEmoteImg(field)) {
    closePicker();
    return;
  }
  const current = stripInvisibleTail(field.textContent || "");
  const m = current.match(/\|([^\s|]*)$/);
  const all = getEmotes();
  if (!m || !all.length || !m[1]) {
    closePicker();
    return;
  }
  const q = m[1].toLowerCase();
  const matches = all
    .filter((e) => e.keyword.toLowerCase().startsWith(q))
    .slice(0, 12);
  renderPicker(field, matches);
};

// ---------- Revert / restore emote blocks in the input ----------

// The hidden keyword span that follows an inserted emote <img>.
const emoteBlockBefore = (node: Node): HTMLElement | null => {
  const prev = node.previousSibling;
  if (!prev || prev.nodeType !== Node.ELEMENT_NODE) return null;
  const span = prev as HTMLElement;
  if (span.tagName !== "SPAN") return null;
  const img = span.previousSibling;
  if (!img || img.nodeType !== Node.ELEMENT_NODE) return null;
  if (!(img as HTMLElement).dataset || !(img as HTMLElement).dataset.ytcccKeyword) return null;
  return span;
};

// Turn an emote block back into plain text. Any text typed right after the
// block is merged in (zero-width markers stripped) and the caret lands
// right after the characters the person typed.
const revertEmoteBlock = (
  field: Field,
  span: HTMLElement,
  caretNode?: Node | null,
  caretOff?: number
): void => {
  const img = span.previousSibling as HTMLElement;
  const kw = (img.dataset.ytcccKeyword || "").replace(/\u200b/g, "");
  const text = document.createTextNode(kw);
  span.parentNode!.replaceChild(text, span);
  img.remove();
  let typed = 0;
  if (
    caretNode &&
    caretNode.nodeType === Node.TEXT_NODE &&
    caretNode.parentNode === text.parentNode
  ) {
    const val = caretNode.nodeValue || "";
    const off = Math.min(caretOff ?? val.length, val.length);
    typed = val.slice(0, off).replace(/\u200b/g, "").length;
  }
  const cur = text as Text;
  while (cur.nextSibling && cur.nextSibling.nodeType === Node.TEXT_NODE) {
    const nx = cur.nextSibling as Text;
    cur.nodeValue = (cur.nodeValue || "") + (nx.nodeValue || "").replace(/\u200b/g, "");
    nx.remove();
  }
  const caretPos = Math.min(kw.length + typed, (cur.nodeValue || "").length);
  const range = document.createRange();
  range.setStart(cur, caretPos);
  range.collapse(true);
  const sel = window.getSelection();
  sel!.removeAllRanges();
  sel!.addRange(range);
};

// Typing a word character right after an emote ("war" -> "warm") turns the
// block back into plain text so the word is not split in the sent message.
const revertExtendedEmote = (field: Field | null): void => {
  if (!field) return;
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || !sel.anchorNode || !field.contains(sel.anchorNode)) return;
  const node = sel.anchorNode;
  if (node.nodeType !== Node.TEXT_NODE) return;
  const val = node.nodeValue || "";
  if (!/[\u200b]+[\p{L}\p{N}_]/u.test(val)) return;
  const span = emoteBlockBefore(node);
  if (!span) return;
  const off = sel.anchorOffset;
  revertEmoteBlock(field, span, node, off);
};

// One Backspace removes the whole emote and restores its text.
const restoreEmoteToText = (field: Field | null): boolean => {
  if (!field) return false;
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || !sel.anchorNode || !field.contains(sel.anchorNode)) return false;
  const node = sel.anchorNode;
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const val = node.nodeValue || "";
  const off = sel.anchorOffset;
  let span: HTMLElement | null = null;
  if (off === 0) span = emoteBlockBefore(node);
  else if (off === val.length && val === "\u200b") span = emoteBlockBefore(node);
  if (!span) return false;
  revertEmoteBlock(field, span);
  return true;
};

// Replace every emote block with its plain keyword (and drop zero-width
// anchors) so YouTube reads the exact raw text when the message is sent.
const flushEmoteField = (field: Field | null): void => {
  if (!field) return;
  const imgs = Array.from(
    field.querySelectorAll<HTMLElement>("img[data-ytccc-keyword]")
  );
  for (const img of imgs) {
    const span = img.nextSibling;
    if (
      span &&
      span.nodeType === Node.ELEMENT_NODE &&
      (span as HTMLElement).tagName === "SPAN"
    ) {
      const kw = (img.dataset.ytcccKeyword || "").replace(/\u200b/g, "");
      span.parentNode!.replaceChild(document.createTextNode(kw), span);
    }
    img.remove();
  }
  const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const n of nodes) {
    const v = n.nodeValue || "";
    const cleaned = v.replace(/\u200b/g, "");
    if (!cleaned) n.remove();
    else if (cleaned !== v) n.nodeValue = cleaned;
  }
};

// While flushing we re-dispatch "input" so YouTube's own model (built from
// input events) recomputes from the now-plain DOM; our handlers must not
// react to that synthetic event.
let flushing = false;

const flushFieldWithModel = (field: Field | null): void => {
  if (!field) return;
  flushEmoteField(field);
  flushing = true;
  try {
    field.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true })
    );
  } catch {
    /* older browsers: ignore */
  }
  flushing = false;
};

const flushActiveField = (field?: Field | null): void => {
  flushFieldWithModel(field || lastField || getInputField());
};

// Fields we have ever inserted/converted an emote in. Direct references,
// so they work even inside shadow roots (poll composer, popups, ...).
const emoteFields = new Set<HTMLElement>();

const markEmoteField = (field: Field | null): void => {
  if (!field || !field.dataset) return;
  // Picker internals (panel items, our own SVG buttons) are never emote
  // fields â€” marking them let flush convert their imgs to text (corruption).
  if (findPicker()?.contains(field)) return;
  field.dataset.ytcccEmoteField = "1";
  emoteFields.add(field);
};

const flushTrackedFields = (): void => {
  for (const f of [...emoteFields]) {
    if (!f.isConnected) {
      emoteFields.delete(f);
      continue;
    }
    if (f.querySelector("img[data-ytccc-keyword]")) flushFieldWithModel(f);
  }
};

// ---------- Restore emote images after external rebuilds ----------

// When a tracked field loses focus YouTube rebuilds it as plain text (and
// our own flush-on-outside-click does the same before sends). When the user
// returns (focusin) or pastes text back, exact keyword tokens are rendered
// back into emote images so the WYSIWYG input survives focus loss. Only
// FULL-token matches convert â€” partial words and arbitrary text stay put,
// and 7TV emotes are included here because a restored keyword is known to
// have been an emote (unlike hand-typed bare words).
let restoring = false;
// Set while the panel inserts plain text on purpose: the programmatic
// field.focus() inside must not trigger the focusin re-render that would
// turn that deliberate text back into an image.
let skipRestore = false;
const restoreEmoteImages = (field: Field | null): void => {
  if (!field || restoring || flushing) return;
  if (!field.dataset || field.dataset.ytcccEmoteField !== "1") return;
  if (findPicker()?.contains(field)) return;
  const all = getEmotes();
  if (!all.length) return;
  const byKw = new Map(all.map((e) => [e.keyword.toLowerCase(), e]));
  const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let changed = false;
  for (const node of nodes) {
    const val = node.nodeValue || "";
    // Hidden keyword spans carry \u200b wrappers, so their text can never
    // match a bare token here â€” no explicit exclusion needed.
    if (!val.trim()) continue;
    const parts = val.split(/(\s+)/); // separators stay at odd indices
    let converted = false;
    for (let i = 0; i < parts.length; i += 2) {
      const kw = byKw.get((parts[i] || "").toLowerCase());
      if (kw && emoteSrc(kw)) converted = true;
    }
    if (!converted) continue;
    changed = true;
    const frag = document.createDocumentFragment();
    parts.forEach((part, i) => {
      if (!part) return;
      const kw = i % 2 === 0 ? byKw.get(part.toLowerCase()) : undefined;
      if (kw && emoteSrc(kw)) {
        frag.appendChild(buildEmoteFrag(kw, false));
        // Zero-width anchor after the block so characters typed next stay
        // visible and revertExtendedEmote can still merge them into text.
        frag.appendChild(document.createTextNode("\u200b"));
        return;
      }
      frag.appendChild(document.createTextNode(part));
    });
    node.parentNode!.replaceChild(frag, node);
  }
  if (changed) {
    // Guard flag: the caret move and DOM swap must never re-enter this
    // function through focus/input events the platform may fire while we
    // are mid-mutation.
    restoring = true;
    try {
      placeCaretEnd(field);
    } finally {
      restoring = false;
    }
  }
};

const tryAutoComplete = (field: Field | null): boolean => {
  const all = getEmotes();
  if (!field || !all.length) return false;
  markEmoteField(field);
  const current = stripInvisibleTail(field.textContent || "");
  const m = current.match(/\|([^\s|]+)$/);
  const node = lastTextNode(field);
  if (!node) return false;
  const val = node.nodeValue || "";
  let tail: string;
  let idx: number;
  if (m) {
    tail = m[1];
    idx = val.toLowerCase().lastIndexOf("|" + tail.toLowerCase());
    if (idx === -1) return false;
    idx += 1;
  } else {
    // Full name without "|" converts to the emote. Zero-width markers next
    // to previously inserted emotes are stripped for matching so new words
    // typed after them still convert.
    const clean = val.replace(/\u200b/g, "");
    const bm = clean.match(/([^\s|]+)$/);
    if (!bm) return false;
    tail = bm[1];
    idx = val.toLowerCase().lastIndexOf(tail.toLowerCase());
    if (idx === -1) return false;
  }
  const pool = m ? all : all.filter((e) => e.source !== "7tv");
  const kw = pool.find((e) => e.keyword.toLowerCase() === tail.toLowerCase());
  if (!kw) return false;
  const src = emoteSrc(kw);
  if (!src) return false;
  const before = val.slice(0, idx);
  const after = val.slice(idx + tail.length);
  // Auto-space only completes from the "|" picker; plain typing converts
  // without adding a space.
  const frag = document.createDocumentFragment();
  if (before) frag.appendChild(document.createTextNode(before));
  frag.appendChild(buildEmoteFrag(kw, !!m));
  if (after) {
    frag.appendChild(document.createTextNode(after));
  } else if (!m) {
    // Keep a caret anchor outside the hidden span so the next typed
    // characters stay visible.
    frag.appendChild(document.createTextNode("\u200b"));
  }
  node.parentNode!.replaceChild(frag, node);
  placeCaretEnd(field);
  closePicker();
  return true;
};

const tabComplete = (field: Field | null): boolean => {
  const all = getEmotes();
  if (!field || !all.length) return false;
  const current = stripInvisibleTail(field.textContent || "");
  const m = current.match(/\|([^\s|]*)$/);
  if (m) {
    const q = m[1].toLowerCase();
    const hit = all.find((x) => x.keyword.toLowerCase().startsWith(q));
    if (!hit) return false;
    insertEmote(hit.keyword);
    closePicker();
    return true;
  }
  // Bare-word completion (no "|" prefix): typing "app" or ":app" and hitting
  // Tab converts the trailing token into the matching emote image.
  const clean = current.replace(/\u200b/g, "");
  const bm = clean.match(/([^\s|]+)$/);
  if (!bm) return false;
  const token = bm[1];
  const q = token.replace(/^:/, "").toLowerCase();
  // Direction 2: bare word / ":name" completes YouTube built-in emotes only
  // (7TV emotes are triggered via "|").
  const pool = all.filter((e) => e.source !== "7tv");
  const hit = pool.find((x) => x.keyword.toLowerCase().startsWith(q));
  if (!hit) return false;
  const before = clean.slice(0, clean.length - token.length);
  const frag = document.createDocumentFragment();
  if (before) frag.appendChild(document.createTextNode(before));
  frag.appendChild(buildEmoteFrag(hit, false));
  // Bare-word path: no auto-space (R5.2), keep a zero-width caret anchor.
  frag.appendChild(document.createTextNode("\u200b"));
  const node = lastTextNode(field);
  if (!node) return false;
  node.parentNode!.replaceChild(frag, node);
  placeCaretEnd(field);
  closePicker();
  return true;
};

// ---------- Event wiring ----------

const fieldFromEvent = (e: Event): Field | null => {
  if ((e as CompositionEvent).composedPath && typeof (e as CompositionEvent).composedPath === "function") {
    const p = (e as CompositionEvent).composedPath();
    if (p && p.length) return p[0] as Field;
  }
  return e.target as Field;
};

const isInputField = (field: Field | null): boolean =>
  !!(
    field &&
    field.closest &&
    field.closest("#input, #textbox, yt-live-chat-message-input-renderer") &&
    // The emoji picker popup lives INSIDE the message input renderer too â€”
    // its elements (search box, our buttons, panel items) must never count
    // as the chat field or text insertion targets them.
    !findPicker()?.contains(field)
  );

const selectedInputField = (): Field | null => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const node = sel.getRangeAt(0).commonAncestorContainer;
  const el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  const field = el?.closest(
    "#input, #textbox, yt-live-chat-message-input-renderer"
  ) as Field | null;
  return isInputField(field) ? field : null;
};

const copiedEmoteText = (range: Range): string | null => {
  const fragment = range.cloneContents();
  const imgs = fragment.querySelectorAll<HTMLElement>(
    "img[data-ytccc-keyword]"
  );
  if (!imgs.length) return null;
  imgs.forEach((img) => {
    const hidden = img.nextElementSibling;
    // Native clipboard serialization includes img.alt as well as the hidden
    // source span. Drop the image when that span is present to avoid copying
    // every emote name twice; retain its name for a partial image-only range.
    if (hidden?.tagName === "SPAN") img.remove();
    else img.replaceWith(document.createTextNode(img.dataset.ytcccKeyword || ""));
  });
  return (fragment.textContent || "")
    .replace(/\u200b/g, "")
    .replace(/\u00a0/g, " ");
};

const onFieldInput = (e: Event): void => {
  if (flushing) return;
  const field = fieldFromEvent(e);
  if (!isInputField(field)) return;
  lastField = field;
  markEmoteField(field);
  // Pasted text may carry emote keywords (a copy of emote input itself, or
  // a hand-copied keyword): re-render exact matches so pasted emotes show
  // as images instead of raw text.
  if ((e as InputEvent).inputType === "insertFromPaste") {
    restoreEmoteImages(field);
  }
  revertExtendedEmote(field);
  tryAutoComplete(field);
  updatePickerFromField(field);
};

export const initSuggest = (): void => {
  void loadStvUsers();
  // Invisible-when-selected styling for the hidden keyword spans: the UA
  // selection colors would otherwise paint the 1px keyword as a dash under
  // Ctrl+A. Injected once, id-guarded like the toast styles.
  if (!document.getElementById("ytccc-emote-input-styles")) {
    const style = document.createElement("style");
    style.id = "ytccc-emote-input-styles";
    style.textContent = `
.ytccc-emote-t { font-size:1px;color:transparent;line-height:0;vertical-align:middle;letter-spacing:0; }
.ytccc-emote-t::selection { color:transparent;background:transparent; }`;
    document.documentElement.appendChild(style);
  }
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.emoteUsers) {
        void loadStvUsers().then(() => injectIntoCatalog());
      }
    });
  }

  document.addEventListener("input", onFieldInput, true);
  document.addEventListener("compositionend", onFieldInput, true);

  document.addEventListener(
    "copy",
    (e) => {
      const field = selectedInputField();
      const sel = window.getSelection();
      if (!field || !sel || sel.isCollapsed || !e.clipboardData) return;
      const text = copiedEmoteText(sel.getRangeAt(0));
      if (text === null) return;
      e.clipboardData.setData("text/plain", text);
      e.preventDefault();
    },
    true
  );

  // Key handling sits on window capture so it runs BEFORE YouTube's own
  // listeners (their send handler may read the field on keydown).
  window.addEventListener(
    "keydown",
    (e) => {
      const field = fieldFromEvent(e);
      if (!isInputField(field)) return;
      lastField = field;
      if (e.key === "Backspace") {
        // One backspace removes the whole emote and restores its text.
        if (restoreEmoteToText(field)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      const pickerOpen = !!(pickerEl && pickerItems.length);
      if (e.key === "Tab") {
        if (pickerOpen) {
          e.preventDefault();
          e.stopPropagation();
          insertEmote(pickerItems[pickerIndex].keyword);
          closePicker();
          return;
        }
        // Only swallow Tab when an emote was actually completed; otherwise let
        // the default handler run so YouTube's own Tab handling (mention
        // autocomplete like "@channel") can proceed.
        if (tabComplete(field)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (!pickerOpen) {
        // Sending: unwrap emotes to their raw text right before YouTube
        // reads the field, so the outgoing message is plain text.
        if (
          e.key === "Enter" &&
          !e.shiftKey &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey
        ) {
          flushActiveField(field);
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        pickerIndex =
          (pickerIndex + dir + pickerItems.length) % pickerItems.length;
        highlightPicker();
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        insertEmote(pickerItems[pickerIndex].keyword);
        closePicker();
      } else if (e.key === "Escape") {
        closePicker();
      }
    },
    true
  );

  // Enter may arrive as a paragraph "beforeinput" (some fields) â€” flush
  // there too; flushing is idempotent.
  window.addEventListener(
    "beforeinput",
    (e) => {
      const type = (e as InputEvent).inputType || "";
      if (type !== "insertLineBreak" && type !== "insertParagraph") return;
      const field = fieldFromEvent(e);
      if (isInputField(field)) flushActiveField(field);
    },
    true
  );

  // Flush on submit clicks: any click outside the tracked fields (buttons,
  // dialogs, ...) converts their emotes back to raw text. References are
  // held directly, so this also works for fields inside shadow roots.
  window.addEventListener(
    "click",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t || typeof t.closest !== "function") return;
      // Picker interactions insert emotes â€” never flush those.
      if (
        t.closest(
          ".ytccc-stv-emoji, .ytccc-stv-panel, .ytccc-stv-row, .ytccc-stv-cat, .ytccc-stv-avatar, #ytccc-emote-picker"
        )
      )
        return;
      if (pickerEl && pickerEl.contains(t)) return;
      if (
        t.closest(
          "tp-yt-emoji-picker-renderer, yt-emoji-picker-renderer, [data-emoji-id]"
        )
      )
        return;
      for (const f of emoteFields) {
        if (f.contains(t)) return;
      }
      flushTrackedFields();
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      if (!pickerEl || pickerEl.contains(e.target as Node)) return;
      if (!isInputField(fieldFromEvent(e))) closePicker();
    },
    true
  );

  window.addEventListener("scroll", () => {
    if (pickerEl) positionPicker(lastField);
  }, true);
  window.addEventListener("resize", () => {
    if (pickerEl) positionPicker(lastField);
  });

  // Track the field the user interacts with. Picker clicks must NOT update
  // this: the picker lives inside the message input renderer, so the old
  // loose closest() check hijacked lastField with picker elements and text
  // ended up inside our own SVG / panel items (spam-click corruption).
  document.addEventListener(
    "click",
    (e) => {
      const t = fieldFromEvent(e);
      if (!t || typeof t.closest !== "function") return;
      if (findPicker()?.contains(t)) return;
      const editable = t.closest(
        "[contenteditable='true'], [contenteditable='plaintext-only'], input, textarea"
      );
      if (
        editable &&
        editable.closest("#input, #textbox, yt-live-chat-message-input-renderer")
      ) {
        lastField = editable as Field;
      }
    },
    true
  );

  // Coming back to a tracked field (Tab back in, click, window switch) is
  // the moment YouTube's text rebuild is visible: re-render any emote
  // keywords it flattened so the input stays WYSIWYG.
  document.addEventListener(
    "focusin",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (!t || typeof t.closest !== "function") return;
      if (findPicker()?.contains(t)) return;
      const editable = t.closest(
        "[contenteditable='true'], [contenteditable='plaintext-only'], input, textarea"
      );
      if (!editable || !isInputField(editable as Field)) return;
      lastField = editable as Field;
      if (skipRestore) return;
      restoreEmoteImages(editable as Field);
    },
    true
  );

  log("suggest module ready");
};
