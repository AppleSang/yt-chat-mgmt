/**
 * Self-updater page (opened from the popup when a newer release exists).
 * MV3 forbids running fetched code, so the flow is: download the release
 * zip -> parse -> verify -> write it over the unpacked extension folder
 * (File System Access handle, picked once by the user) -> reload.
 */
import {
  t,
  setLanguage,
  isLanguageCode,
  DEFAULT_LANGUAGE,
  type Dict
} from "../language/i18n";
import { parseZip, type ZipEntry } from "./zip";

const API_LATEST = "https://api.github.com/repos/AppleSang/yt-chat-mgmt/releases/latest";
const ASSET_RE = /^yt-chat-mgmt-v\d+(\.\d+)*\.zip$/i;
const TAG_RE = /^v?\d+(\.\d+)*$/;

// lib.dom does not carry the directory-picker entry points yet.
type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (o: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<DirHandle>;
  }
}

const parseVersion = (v: string): number[] =>
  v.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);

const compareVersions = (a: number[], b: number[]): number => {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
};

const applyI18n = (): void => {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n as keyof Dict);
  });
};

const statusEl = document.getElementById("status") as HTMLElement;
const actionEl = document.getElementById("action") as HTMLButtonElement;

const setStatus = (msg: string): void => {
  statusEl.textContent = msg;
};

interface ReleaseInfo {
  version: string;
  assetUrl: string;
}

const fetchRelease = async (): Promise<ReleaseInfo> => {
  const res = await fetch(API_LATEST, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = (await res.json()) as {
    tag_name?: string;
    assets?: { name?: string; browser_download_url?: string }[];
  };
  const tag = String(data.tag_name || "");
  if (!TAG_RE.test(tag)) throw new Error("GitHub tag is not a version");
  const asset = (data.assets || []).find((a) => ASSET_RE.test(String(a.name || "")));
  if (!asset || !asset.browser_download_url) throw new Error("GitHub release has no zip asset");
  return { version: tag.replace(/^v/, ""), assetUrl: String(asset.browser_download_url) };
};

// ---------- directory handle persistence -------------------------------------
// The handle survives in IndexedDB; the browser may still ask for permission
// again on a later session, which needs the click gesture we run inside of.
const DB_NAME = "ytccc-updater";
const STORE = "handles";
const KEY = "extDir";

const withDb = async <T>(fn: (db: IDBDatabase) => IDBRequest<T>): Promise<T | null> => {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const out = await new Promise<T>((resolve, reject) => {
      const req = fn(db);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return out;
  } catch (e) {
    return null;
  }
};

const getSavedDir = async (): Promise<DirHandle | null> =>
  (await withDb<DirHandle>((db) => db.transaction(STORE).objectStore(STORE).get(KEY))) || null;

const saveDir = async (dir: DirHandle): Promise<void> => {
  await withDb<IDBValidKey>((db) =>
    db.transaction(STORE, "readwrite").objectStore(STORE).put(dir, KEY)
  );
};

const clearSavedDir = async (): Promise<void> => {
  await withDb<undefined>((db) =>
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(KEY)
  );
};

// Resolves the extension folder handle: cached handle first (with a
// permission re-ask inside the click gesture), OS picker otherwise. The
// folder is only valid while it holds manifest.json; a stale handle is
// dropped so the retry can prompt again.
const ensureDir = async (): Promise<DirHandle> => {
  const cached = await getSavedDir();
  if (cached) {
    let perm = cached.queryPermission
      ? await cached.queryPermission({ mode: "readwrite" })
      : "granted";
    if (perm !== "granted" && cached.requestPermission) {
      perm = await cached.requestPermission({ mode: "readwrite" });
    }
    if (perm === "granted") {
      const ok = await cached.getFileHandle("manifest.json").then(
        () => true,
        () => false
      );
      if (ok) return cached;
    }
    await clearSavedDir();
    throw new Error(t(perm === "granted" ? "updateWrongFolder" : "updateNoPermission"));
  }
  if (typeof window.showDirectoryPicker !== "function") {
    throw new Error(t("updateNoPicker"));
  }
  const dir = await window.showDirectoryPicker({ mode: "readwrite" });
  const perm = dir.requestPermission
    ? await dir.requestPermission({ mode: "readwrite" })
    : "granted";
  if (perm !== "granted") throw new Error(t("updateNoPermission"));
  const manifestOk = await dir.getFileHandle("manifest.json").then(
    () => true,
    () => false
  );
  if (!manifestOk) throw new Error(t("updateWrongFolder"));
  await saveDir(dir);
  return dir;
};

const zipManifestVersion = (entries: ZipEntry[]): string => {
  const m = entries.find((e) => e.name === "manifest.json");
  if (!m) return "";
  try {
    return String(JSON.parse(new TextDecoder().decode(m.data)).version || "");
  } catch (e) {
    return "";
  }
};

// Writes every entry under the folder; manifest.json goes last so that its
// presence marks a complete (non-truncated) update.
const writeFiles = async (dir: DirHandle, entries: ZipEntry[]): Promise<void> => {
  const ordered = [...entries].sort((a, b) =>
    a.name === "manifest.json" ? 1 : b.name === "manifest.json" ? -1 : 0
  );
  for (const { name, data } of ordered) {
    const parts = name.split("/");
    const fileName = parts.pop() as string;
    let cur: DirHandle = dir;
    for (const p of parts) cur = (await cur.getDirectoryHandle(p, { create: true })) as DirHandle;
    const fh = await cur.getFileHandle(fileName, { create: true });
    const w = await fh.createWritable();
    await w.write(data as unknown as BlobPart);
    await w.close();
  }
};

const performUpdate = async (rel: ReleaseInfo): Promise<void> => {
  actionEl.disabled = true;
  try {
    // First step: the folder must be resolved while the click gesture is
    // still alive (the OS picker / permission prompt consume it).
    const dir = await ensureDir();
    setStatus(t("updateDownloading", { v: rel.version }));
    const res = await fetch(rel.assetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    setStatus(t("updateUnpacking"));
    const entries = await parseZip(bytes);
    // Never overwrite the folder with an archive that is not the release
    // it claims to be.
    if (zipManifestVersion(entries) !== rel.version) throw new Error(t("updateInvalidZip"));
    setStatus(t("updateWriting"));
    await writeFiles(dir, entries);
    setStatus(t("updateDone", { v: rel.version }));
    // The page dies together with the extension here - expected end state.
    setTimeout(() => chrome.runtime.reload(), 1500);
  } catch (e) {
    setStatus(t("updateFailed", { detail: e instanceof Error ? e.message : String(e) }));
    bindAction(t("updateRetry"), () => void performUpdate(rel));
  }
};

// Single click dispatcher: the button's meaning follows the page state
// (start update / retry), never two handlers at once.
let currentAction: (() => void) | null = null;

actionEl.addEventListener("click", () => {
  if (currentAction && !actionEl.disabled) currentAction();
});

const bindAction = (label: string, fn: () => void): void => {
  currentAction = fn;
  actionEl.hidden = false;
  actionEl.disabled = false;
  actionEl.textContent = label;
};

const run = async (): Promise<void> => {
  actionEl.hidden = true;
  currentAction = null;
  setStatus(t("updateChecking"));
  let rel: ReleaseInfo | null = null;
  try {
    rel = await fetchRelease();
  } catch (e) {
    setStatus(t("updateFailed", { detail: e instanceof Error ? e.message : String(e) }));
    bindAction(t("updateRetry"), () => void run());
    return;
  }
  const current = parseVersion(chrome.runtime.getManifest().version || "");
  if (compareVersions(current, parseVersion(rel.version)) >= 0) {
    setStatus(t("updateUptodate"));
    return;
  }
  setStatus(t("updateReady", { v: rel.version }));
  bindAction(t("updateBtn"), () => rel && void performUpdate(rel));
};

chrome.storage.sync.get({ language: DEFAULT_LANGUAGE }, (d) => {
  if (isLanguageCode(d.language)) setLanguage(d.language);
  applyI18n();
  void run();
});
