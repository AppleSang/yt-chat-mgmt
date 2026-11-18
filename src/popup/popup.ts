import {
  t,
  setLanguage,
  getLanguage,
  isLanguageCode,
  LANGUAGES,
  DEFAULT_LANGUAGE
} from "../language/i18n";

const $ = (id: string): HTMLElement => document.getElementById(id)!;

const els = {
  main: $("main") as HTMLElement,
  language: $("language") as HTMLSelectElement,
  enabled: $("enabled") as HTMLInputElement,
  commandDelete: $("commandDelete") as HTMLInputElement,
  commandDeletePair: $("commandDeletePair") as HTMLElement,
  autoLiveChat: $("autoLiveChat") as HTMLInputElement,
  hideBadges: $("hideBadges") as HTMLInputElement,
  hideAvatars: $("hideAvatars") as HTMLInputElement,
  botList: $("botList") as HTMLInputElement,
  botToastSeconds: $("botToastSeconds") as HTMLInputElement,
  botToastVal: $("botToastVal") as HTMLElement,
  toastPosTop: $("toastPosTop") as HTMLButtonElement,
  toastPosBottom: $("toastPosBottom") as HTMLButtonElement,
  bannerPosTop: $("bannerPosTop") as HTMLButtonElement,
  bannerPosBottom: $("bannerPosBottom") as HTMLButtonElement,
  updateBadge: $("updateBadge") as HTMLAnchorElement,
  updateAction: $("updateAction") as HTMLButtonElement,
  sevenTvSearch: $("sevenTvSearch") as HTMLInputElement,
  sevenTvResults: $("sevenTvResults") as HTMLElement,
  sevenTvAdded: $("sevenTvAdded") as HTMLElement,
  emoteHq: $("emoteHq") as HTMLInputElement,
  emoteHqWarn: $("emoteHqWarn") as HTMLElement,
  logCount: $("logCount") as HTMLElement,
  logList: $("logList") as HTMLElement,
  clearLog: $("clearLog") as HTMLButtonElement,
  statCache: $("statCache") as HTMLElement,
  statProgress: $("statProgress") as HTMLElement,
  statBarFill: $("statBarFill") as HTMLElement,
  statBarText: $("statBarText") as HTMLElement
};

const ROLE_COLORS: Record<string, string> = {
  owner: "role-owner",
  moderator: "role-moderator",
  member: "role-member",
  viewer: "role-viewer"
};

const ROLE_TAGS: Record<string, { key: Parameters<typeof t>[0] }> = {
  owner: { key: "roleOwner" },
  moderator: { key: "roleModerator" },
  member: { key: "roleMember" },
  viewer: { key: "roleViewer" }
};

const fmtTime = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const makeAvatarPh = (author: string): HTMLElement => {
  const ph = document.createElement("div");
  ph.className = "ava-ph";
  ph.textContent = (author || "?").trim().charAt(0).toUpperCase() || "?";
  return ph;
};

interface LogEntry {
  author?: string;
  text?: string;
  at?: number;
  role?: string;
  avatar?: string | null;
}

const renderLog = (log: LogEntry[]): void => {
  els.logList.innerHTML = "";
  if (!log.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = t("popupNoData");
    els.logList.appendChild(li);
    return;
  }
  log.forEach((entry) => {
    const li = document.createElement("li");
    const role = entry.role || "viewer";
    li.className = ROLE_COLORS[role] || ROLE_COLORS.viewer;

    if (entry.avatar) {
      const img = document.createElement("img");
      img.className = "ava";
      img.src = entry.avatar;
      img.referrerPolicy = "no-referrer";
      img.onerror = () => {
        img.replaceWith(makeAvatarPh(entry.author || "?"));
      };
      li.appendChild(img);
    } else {
      li.appendChild(makeAvatarPh(entry.author || "?"));
    }

    const head = document.createElement("div");
    head.className = "entry-head";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = entry.author || "?";
    name.title = entry.author || "";
    head.appendChild(name);

    const tag = document.createElement("span");
    tag.className = "role-tag";
    tag.textContent = t(ROLE_TAGS[role]?.key ?? "roleViewer");
    head.appendChild(tag);

    const time = document.createElement("span");
    time.className = "time";
    time.textContent = entry.at ? fmtTime(entry.at) : "";
    head.appendChild(time);

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = entry.text || "";

    li.appendChild(head);
    li.appendChild(text);
    els.logList.appendChild(li);
  });
};

// ---------- i18n apply ----------

interface I18nParams {
  [key: string]: string | number;
}

const applyI18n = (): void => {
  document.documentElement.lang = getLanguage();
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n as Parameters<typeof t>[0];
    el.textContent = t(key);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder as Parameters<typeof t>[0];
    (el as HTMLInputElement).placeholder = t(key);
  });
};

const initLanguageSelect = (): void => {
  for (const { code, label } of LANGUAGES) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = label;
    els.language.appendChild(opt);
  }
  els.language.addEventListener("change", () => {
    const lang = els.language.value;
    chrome.storage.sync.set({ language: lang });
    if (isLanguageCode(lang)) setLanguage(lang);
    applyI18n();
    renderUpdateBadge();
  });
};

// ---------- update badge ----------
// Settings-card head shows the release state at a glance: same version ->
// "Hello @user" (when the own handle is known), older -> pulsing yellow link
// to the releases page, newer (local dev build) -> static purple tag.
// GitHub's REST API answers with CORS `*`, so a plain popup fetch needs no
// extra host permission.
const RELEASES_URL = "https://github.com/AppleSang/yt-chat-mgmt/releases";

// Temporarily hidden at the owner's request: the badge still links to the
// Releases page, so the popup stays a plain release shortcut. Flip this to
// true to bring the in-popup self-updater button back.
const SHOW_UPDATE_ACTION = false;

let updateState: "new" | "dev" | "ok" | null = null;
let updateVersion = "";
let helloHandle = "";

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

const renderUpdateBadge = (): void => {
  const badge = els.updateBadge;
  // The self-updater button only makes sense when a newer release exists.
  els.updateAction.hidden = !SHOW_UPDATE_ACTION || updateState !== "new";
  if (!updateState) {
    badge.hidden = true;
    return;
  }
  if (updateState === "new") {
    badge.textContent = `${t("popupNewUpdate")} ${updateVersion}`;
    badge.href = RELEASES_URL;
    badge.classList.add("update-new");
    badge.classList.remove("update-dev", "update-hello");
  } else if (updateState === "dev") {
    badge.textContent = t("popupDevBuild");
    badge.removeAttribute("href");
    badge.classList.add("update-dev");
    badge.classList.remove("update-new", "update-hello");
  } else {
    // Up to date: greet the user instead of an empty slot. Without a
    // detected handle (no YouTube page opened yet) the slot stays empty.
    if (!helloHandle) {
      badge.hidden = true;
      return;
    }
    badge.textContent = t("popupHelloUser", { user: helloHandle });
    badge.removeAttribute("href");
    badge.classList.add("update-hello");
    badge.classList.remove("update-new", "update-dev");
  }
  badge.hidden = false;
};

const checkUpdate = async (): Promise<void> => {
  try {
    // The greeting handle is written by the content script's guide
    // detection; absent until a YouTube page was opened.
    const stored = await new Promise<{ ownHandle?: string }>((resolve) => {
      chrome.storage.local.get({ ownHandle: "" }, (d) => resolve(d));
    });
    helloHandle = String(stored.ownHandle || "");
    const res = await fetch(
      "https://api.github.com/repos/AppleSang/yt-chat-mgmt/releases/latest",
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return;
    const data = (await res.json()) as { tag_name?: string };
    const tag = String(data.tag_name || "");
    // A non semver-ish tag cannot be compared reliably: stay silent.
    if (!/^v?\d+(\.\d+)*$/.test(tag)) return;
    const cmp = compareVersions(
      parseVersion(chrome.runtime.getManifest().version || ""),
      parseVersion(tag)
    );
    if (cmp === 0) {
      updateState = "ok";
      updateVersion = "";
    } else {
      updateState = cmp < 0 ? "new" : "dev";
      updateVersion = tag.replace(/^v/, "");
    }
    renderUpdateBadge();
  } catch (e) {
    /* offline or rate-limited: the badge simply stays hidden */
  }
};

// Footer "report an issue" button: opens the repo's new-issue page in a new
// tab. chrome.tabs.create works from the popup without the "tabs" permission.
const initReportIssue = (): void => {
  document
    .getElementById("popupReportIssue")
    ?.addEventListener("click", () => {
      chrome.tabs.create({
        url: "https://github.com/AppleSang/yt-chat-mgmt/issues/new"
      });
    });
};

const loadLanguage = (cb: () => void): void => {
  chrome.storage.sync.get({ language: DEFAULT_LANGUAGE }, (d) => {
    if (isLanguageCode(d.language)) setLanguage(d.language);
    els.language.value = getLanguage();
    applyI18n();
    cb();
  });
};

// ---------- load / save ----------

const loadAll = (): void => {
  chrome.storage.sync.get(
    {
      enabled: true,
      commandDelete: true,
      autoLiveChat: true,
      hideBadges: false,
      hideAvatars: false,
      botList: "@nightbot, @streamelements, @streamlabs",
      botToastSeconds: 10,
      toastPosition: "bottom",
      bannerPosition: "top",
      emoteSetIds: "",
      emoteUsers: [],
      emoteHq: false
    },
    (cfg: Record<string, unknown>) => {
      els.enabled.checked = !!cfg.enabled;
      els.commandDelete.checked = !!cfg.commandDelete;
      // The cleanup arm only makes sense while hiding is on - and is forced
      // off (stored) when the hider is off.
      syncDeleteArm(!!cfg.enabled);
      els.autoLiveChat.checked = !!cfg.autoLiveChat;
      els.hideBadges.checked = !!cfg.hideBadges;
      els.hideAvatars.checked = !!cfg.hideAvatars;
      els.emoteHq.checked = !!cfg.emoteHq;
      els.botList.value = String(cfg.botList || "");
      const secs = Number(cfg.botToastSeconds);
      const safe = Number.isFinite(secs) ? Math.min(35, Math.max(0, Math.floor(secs))) : 10;
      els.botToastSeconds.value = String(safe);
      els.botToastVal.textContent = safe === 0 ? t("popupOff") : `${safe}s`;
      setToastPos(cfg.toastPosition === "top" ? "top" : "bottom");
      setBannerPos(cfg.bannerPosition === "bottom" ? "bottom" : "top");
      els.sevenTvSearch.value = "";
      els.sevenTvResults.dataset.ids = String(cfg.emoteSetIds || "");
      addedUsers = Array.isArray(cfg.emoteUsers) ? (cfg.emoteUsers as AddedUser[]) : [];
      renderAddedUsers();
    }
  );
  chrome.storage.local.get({ deletedLog: [] }, (d) => {
    const log = (d.deletedLog as LogEntry[]) || [];
    els.logCount.textContent = String(log.length).padStart(3, "0");
    renderLog(log.slice(0, 30));
  });
  restoreViewState();
  refreshStats();
};

const save = (key: string, value: unknown): void => {
  chrome.storage.sync.set({ [key]: value });
};

// The cleanup arm lives inside the hider switch: hiding the pair is not
// enough, the stored delete flag must be OFF too so re-enabling the hider
// always starts from a clean, non-deleting state.
const syncDeleteArm = (hiderOn: boolean): void => {
  els.commandDeletePair.hidden = !hiderOn;
  if (!hiderOn && els.commandDelete.checked) {
    els.commandDelete.checked = false;
    save("commandDelete", false);
  }
};

els.enabled.addEventListener("change", () => {
  save("enabled", els.enabled.checked);
  syncDeleteArm(els.enabled.checked);
});
els.commandDelete.addEventListener("change", () =>
  save("commandDelete", els.commandDelete.checked)
);
els.autoLiveChat.addEventListener("change", () =>
  save("autoLiveChat", els.autoLiveChat.checked)
);
els.hideBadges.addEventListener("change", () =>
  save("hideBadges", els.hideBadges.checked)
);
els.hideAvatars.addEventListener("change", () =>
  save("hideAvatars", els.hideAvatars.checked)
);
els.emoteHq.addEventListener("change", () => {
  save("emoteHq", els.emoteHq.checked);
  // Re-check the 4x warning right away instead of waiting for the next poll.
  refreshStats();
});
els.botList.addEventListener("change", () =>
  save("botList", els.botList.value.trim())
);
els.botToastSeconds.addEventListener("input", () => {
  const v = Number(els.botToastSeconds.value) || 0;
  els.botToastVal.textContent = v === 0 ? t("popupOff") : `${v}s`;
  save("botToastSeconds", v);
});

// Radio behaviour for the toast placement tiles: exactly one is pressed.
// Saving lets the content script dock the stack and fire the preview toast.
type ToastPos = "top" | "bottom";
const setToastPos = (pos: ToastPos): void => {
  els.toastPosTop.setAttribute("aria-pressed", pos === "top" ? "true" : "false");
  els.toastPosBottom.setAttribute("aria-pressed", pos === "bottom" ? "true" : "false");
};
els.toastPosTop.addEventListener("click", () => {
  setToastPos("top");
  save("toastPosition", "top");
});
els.toastPosBottom.addEventListener("click", () => {
  setToastPos("bottom");
  save("toastPosition", "bottom");
});

// Same radio behaviour for the pinned-message tiles (exactly one pressed);
// the content script reacts to the storage change instantly.
type BannerPos = "top" | "bottom";
const setBannerPos = (pos: BannerPos): void => {
  els.bannerPosTop.setAttribute("aria-pressed", pos === "top" ? "true" : "false");
  els.bannerPosBottom.setAttribute("aria-pressed", pos === "bottom" ? "true" : "false");
};
els.bannerPosTop.addEventListener("click", () => {
  setBannerPos("top");
  save("bannerPosition", "top");
});
els.bannerPosBottom.addEventListener("click", () => {
  setBannerPos("bottom");
  save("bannerPosition", "bottom");
});

els.clearLog.addEventListener("click", () => {
  chrome.storage.local.set({ deletedLog: [] }, () => loadAll());
});

// ---------- 7TV: user search + set management ----------

const SEVEN_TV_GQL = "https://7tv.io/v3/gql";
const SEVEN_TV_API = "https://7tv.io/v3";
const USER_SEARCH_QUERY =
  "query($query:String!,$limit:Int){users(query:$query,limit:$limit)" +
  "{id username display_name avatar_url}}";

interface SevenTvUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface SevenTvSet {
  id: string;
  name?: string;
}

interface AddedUser {
  id: string;
  name: string;
  avatar: string;
  setIds: string[];
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchSeq = 0;
let addedUsers: AddedUser[] = [];

// ---------- popup view state ----------
// Action popups die on every outside click; without persistence a reopened
// popup always starts from the default view. The 7TV search state (query +
// result cards) is saved so reopening brings the same view back up instead
// of a fresh, different one.
interface PopupViewState {
  stvQuery?: string;
  stvResults?: SevenTvUser[];
}

const VIEW_KEY = "popupViewState";

const saveViewState = (st: PopupViewState): void => {
  chrome.storage.local.set({ [VIEW_KEY]: st });
};

const restoreViewState = (): void => {
  chrome.storage.local.get({ [VIEW_KEY]: {} as PopupViewState }, (d) => {
    const st = (d[VIEW_KEY] || {}) as PopupViewState;
    els.sevenTvSearch.value = String(st.stvQuery || "");
    if (Array.isArray(st.stvResults) && st.stvResults.length) {
      renderSearchResults(st.stvResults);
    }
  });
};

const getSetIds = (): string[] => {
  try {
    const v = els.sevenTvResults.dataset.ids || "";
    return v.split(",").filter(Boolean);
  } catch (e) {
    return [];
  }
};

const saveSetIds = (ids: string[]): void => {
  const unique = [...new Set(ids)].filter(Boolean);
  els.sevenTvResults.dataset.ids = unique.join(",");
  save("emoteSetIds", unique.join(","));
};

const saveAddedUsers = (): void => {
  save("emoteUsers", addedUsers);
};

const fetchUserSetIds = async (user: SevenTvUser): Promise<string[]> => {
  try {
    const res = await fetch(`${SEVEN_TV_API}/users/${user.id}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { emote_sets?: SevenTvSet[] };
    return (data.emote_sets || []).map((s) => s.id).filter(Boolean);
  } catch (e) {
    return [];
  }
};

const renderAddedUsers = (): void => {
  els.sevenTvAdded.textContent = "";
  for (const user of addedUsers) {
    const row = document.createElement("div");
    row.className = "stv-result";

    const img = document.createElement("img");
    img.src = user.avatar || "";
    img.alt = user.name;

    const name = document.createElement("span");
    name.className = "stv-name";
    name.textContent = user.name;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "stv-remove";
    del.textContent = "−";
    del.title = "Remove";
    del.addEventListener("click", () => {
      saveSetIds(
        getSetIds().filter((x) => !user.setIds.includes(x))
      );
      addedUsers = addedUsers.filter((u) => u.id !== user.id);
      saveAddedUsers();
      renderAddedUsers();
    });

    row.appendChild(img);
    row.appendChild(name);
    row.appendChild(del);
    els.sevenTvAdded.appendChild(row);
  }
};

const renderSearchResults = (users: SevenTvUser[]): void => {
  els.sevenTvResults.textContent = "";
  if (!users.length) return;
  for (const user of users) {
    const row = document.createElement("div");
    row.className = "stv-result";

    const img = document.createElement("img");
    img.src = user.avatar_url || "";
    img.alt = user.display_name;

    const name = document.createElement("span");
    name.className = "stv-name";
    name.textContent = user.display_name;

    const add = document.createElement("button");
    add.type = "button";
    add.className = "stv-add";
    add.textContent = "+";
    add.title = "Add";
    add.addEventListener("click", async () => {
      if (add.dataset.busy) return;
      if (addedUsers.some((u) => u.id === user.id)) return;
      add.dataset.busy = "1";
      const ids = await fetchUserSetIds(user);
      delete add.dataset.busy;
      if (!ids.length) return;
      addedUsers = [
        ...addedUsers,
        { id: user.id, name: user.display_name, avatar: user.avatar_url || "", setIds: ids }
      ];
      saveSetIds([...getSetIds(), ...ids]);
      saveAddedUsers();
      renderAddedUsers();
      // Clear the search box + results so the next user can be typed right away.
      els.sevenTvSearch.value = "";
      els.sevenTvResults.textContent = "";
      saveViewState({ stvQuery: "", stvResults: [] });
    });

    row.appendChild(img);
    row.appendChild(name);
    row.appendChild(add);
    els.sevenTvResults.appendChild(row);
  }
};

const runUserSearch = async (query: string): Promise<void> => {
  const q = query.trim();
  if (q.length < 2) {
    els.sevenTvResults.textContent = "";
    saveViewState({ stvQuery: q, stvResults: [] });
    return;
  }
  const seq = ++searchSeq;
  try {
    const res = await fetch(SEVEN_TV_GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: USER_SEARCH_QUERY,
        variables: { query: q, limit: 8 }
      })
    });
    if (!res.ok || seq !== searchSeq) return;
    const body = (await res.json()) as { data?: { users?: SevenTvUser[] } };
    if (seq !== searchSeq) return;
    const users = body.data?.users || [];
    renderSearchResults(users);
    saveViewState({ stvQuery: q, stvResults: users });
  } catch (e) {
    /* ignore */
  }
};

els.sevenTvSearch.addEventListener("input", () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void runUserSearch(els.sevenTvSearch.value), 350);
});

initLanguageSelect();
initReportIssue();
// Self-updater button: opens the dedicated update page in a tab so the
// fetch/unzip/write flow survives the popup closing.
els.updateAction.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("update/update.html") });
});
// Update badge runs after the language is applied so its text is localized.
loadLanguage(() => {
  loadAll();
  void checkUpdate();
});

// --- stats card -------------------------------------------------------------
// Polled every 3s while the popup is open: cache footprint straight from
// storage.local, plus the cache-job progress bar fed by the writer counters
// persisted next to the emote list.
interface StvCacheLike {
  total?: number;
  w2x?: number;
  w4x?: number;
  done4x?: boolean;
  emotes?: unknown[];
}

const fmtBytes = (n: number): string =>
  n >= 1048576
    ? (n / 1048576).toFixed(1) + " MB"
    : n >= 1024
      ? (n / 1024).toFixed(1) + " KB"
      : n + " B";

const refreshStats = (): void => {
  chrome.storage.local.get({ emoteStvCache: null }, (d) => {
    const c = (d.emoteStvCache || null) as StvCacheLike | null;
    const list = c && Array.isArray(c.emotes) ? c.emotes : [];
    const bytes = c ? JSON.stringify(c).length : 0;
    els.statCache.textContent = bytes
      ? `${fmtBytes(bytes)} · ${list.length} ${t("popupStatEmotes")}`
      : "—";
    // 4x warning: visible while 4x mode is on and its cache pass is pending.
    els.emoteHqWarn.hidden = !(els.emoteHq.checked && !!c && !c.done4x);
    // Progress bar over the writer's own counters; ETA assumes the fixed
    // writer rate (30 emotes / 3s = 10/s) and counts the pending 4x pass as
    // remaining work.
    const total = Number(c && c.total) || 0;
    const w2x = Number(c && c.w2x) || 0;
    const w4x = Number(c && c.w4x) || 0;
    const pending4x =
      els.emoteHq.checked && !!c && !c.done4x ? Math.max(0, total - w4x) : 0;
    const active = total > 0 && (w2x < total || pending4x > 0);
    els.statProgress.hidden = !active;
    if (active) {
      const cached = Math.max(w2x, w4x);
      els.statBarFill.style.width =
        Math.min(100, Math.round((cached / total) * 100)) + "%";
      const etaSec = Math.ceil(((total - w2x) + pending4x) / 10);
      const eta =
        etaSec >= 60
          ? `${Math.floor(etaSec / 60)}p ${etaSec % 60}s`
          : `${etaSec}s`;
      els.statBarText.textContent =
        `${cached}/${total} · ` + t("popupStatEta").replace("{s}", eta);
    }
  });
};
setInterval(refreshStats, 3000);
