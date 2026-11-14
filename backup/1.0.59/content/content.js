"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/shared/locales/en.ts
  var en;
  var init_en = __esm({
    "src/shared/locales/en.ts"() {
      "use strict";
      en = {
        // Popup: header / cards
        popupSettingsCard: "Settings",
        popupCleanupOption: "Command cleanup",
        popupAutoLiveChat: "Auto-enable \u201CLive chat\u201D mode",
        popupHideBadges: "Hide badges (member / mod)",
        popupHideAvatars: "Hide chatter avatars",
        popupBotList: "Hide bots (comma separated)",
        popup7tvSearch: "Add 7TV user",
        popupBotToast: "Show bot messages as toasts",
        popupOff: "Off",
        popupLogCard: "Log",
        popupClear: "Clear",
        popupNoData: "No data yet",
        popupLanguage: "Language",
        // Roles
        roleOwner: "Owner",
        roleModerator: "Mod",
        roleMember: "Member",
        roleViewer: "Viewer",
        // Content script
        unknownAuthor: "Unknown",
        botMessagePlaceholder: "(bot message)",
        cleanedPrefix: "Cleaned: {text}"
      };
    }
  });

  // src/shared/locales/vi.ts
  var vi;
  var init_vi = __esm({
    "src/shared/locales/vi.ts"() {
      "use strict";
      vi = {
        // Popup: header / cards
        popupSettingsCard: "C\xE0i \u0111\u1EB7t",
        popupCleanupOption: "D\u1ECDn l\u1EC7nh",
        popupAutoLiveChat: "T\u1EF1 \u0111\u1ED9ng \u201CTr\xF2 chuy\u1EC7n tr\u1EF1c ti\u1EBFp\u201D",
        popupHideBadges: "\u1EA8n badge (h\u1ED9i vi\xEAn / mod)",
        popupHideAvatars: "\u1EA8n avatar ng\u01B0\u1EDDi chat",
        popupBotList: "\u1EA8n bot (c\xE1ch nhau b\u1EB1ng d\u1EA5u ph\u1EA9y)",
        popup7tvSearch: "Th\xEAm user 7TV",
        popupBotToast: "Hi\u1EC3n th\u1ECB tin nh\u1EAFn bot b\u1EB1ng th\xF4ng b\xE1o",
        popupOff: "T\u1EAFt",
        popupLogCard: "Nh\u1EADt k\xFD",
        popupClear: "Xo\xE1",
        popupNoData: "Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u",
        popupLanguage: "Ng\xF4n ng\u1EEF",
        // Roles
        roleOwner: "Ch\u1EE7 k\xEAnh",
        roleModerator: "Mod",
        roleMember: "Member",
        roleViewer: "Viewer",
        // Content script
        unknownAuthor: "Kh\xF4ng r\xF5",
        botMessagePlaceholder: "(tin nh\u1EAFn bot)",
        cleanedPrefix: "\u0110\xE3 d\u1ECDn: {text}"
      };
    }
  });

  // src/shared/i18n.ts
  var LOCALES, DEFAULT_LANGUAGE, current, isLanguageCode, setLanguage, t;
  var init_i18n = __esm({
    "src/shared/i18n.ts"() {
      "use strict";
      init_en();
      init_vi();
      LOCALES = { en, vi };
      DEFAULT_LANGUAGE = "en";
      current = DEFAULT_LANGUAGE;
      isLanguageCode = (v) => typeof v === "string" && v in LOCALES;
      setLanguage = (code) => {
        current = isLanguageCode(code) ? code : DEFAULT_LANGUAGE;
        return current;
      };
      t = (key, params) => {
        const dict = LOCALES[current] || en;
        let out = dict[key] ?? en[key] ?? String(key);
        if (params) {
          for (const k of Object.keys(params)) {
            out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k]));
          }
        }
        return out;
      };
    }
  });

  // src/content/logger.ts
  var log, sleep;
  var init_logger = __esm({
    "src/content/logger.ts"() {
      "use strict";
      log = (...args) => {
        console.debug("[YTCCC]", ...args);
      };
      sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    }
  });

  // src/content/config.ts
  var DEFAULTS, config, botNames, parseBots, isBot, loadConfig, watchConfig;
  var init_config = __esm({
    "src/content/config.ts"() {
      "use strict";
      init_i18n();
      init_logger();
      DEFAULTS = {
        enabled: true,
        prefix: "!",
        autoLiveChat: true,
        hideBadges: false,
        hideAvatars: false,
        botList: "@nightbot, @streamelements, @streamlabs",
        botToastSeconds: 10,
        language: DEFAULT_LANGUAGE
      };
      config = { ...DEFAULTS };
      botNames = [];
      parseBots = (s) => String(s || "").split(/[,;\n]/).map((b) => b.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
      isBot = (author) => {
        if (!botNames.length) return false;
        const a = String(author || "").replace(/^@/, "").toLowerCase();
        return botNames.includes(a);
      };
      loadConfig = async () => {
        try {
          const stored = await chrome.storage.sync.get(
            DEFAULTS
          ) || {};
          const lang = isLanguageCode(stored.language) ? stored.language : DEFAULT_LANGUAGE;
          config = {
            enabled: !!stored.enabled,
            prefix: String(stored.prefix || "!").slice(0, 5),
            autoLiveChat: !!stored.autoLiveChat,
            hideBadges: !!stored.hideBadges,
            hideAvatars: !!stored.hideAvatars,
            botList: String(stored.botList || ""),
            botToastSeconds: (() => {
              const secs = Number(stored.botToastSeconds);
              return Number.isFinite(secs) ? Math.min(35, Math.max(0, Math.floor(secs))) : 10;
            })(),
            language: lang
          };
          setLanguage(config.language);
          botNames = parseBots(config.botList);
          log("config loaded:", JSON.stringify(config));
        } catch (e) {
          config = { ...DEFAULTS };
        }
      };
      watchConfig = () => {
        if (!(chrome.storage && chrome.storage.onChanged)) return;
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area !== "sync") return;
          if (changes.enabled) config.enabled = !!changes.enabled.newValue;
          if (changes.prefix)
            config.prefix = String(changes.prefix.newValue || "!").slice(0, 5);
          if (changes.autoLiveChat) config.autoLiveChat = !!changes.autoLiveChat.newValue;
          if (changes.hideBadges) config.hideBadges = !!changes.hideBadges.newValue;
          if (changes.hideAvatars) config.hideAvatars = !!changes.hideAvatars.newValue;
          if (changes.botList) {
            config.botList = String(changes.botList.newValue || "");
            botNames = parseBots(config.botList);
          }
          if (changes.botToastSeconds) {
            const secs = Number(changes.botToastSeconds.newValue);
            config.botToastSeconds = Number.isFinite(secs) ? Math.min(35, Math.max(0, Math.floor(secs))) : 10;
          }
          if (changes.language) setLanguage(changes.language.newValue);
          log("config updated:", JSON.stringify(config));
        });
      };
    }
  });

  // src/content/dom.ts
  var MESSAGE_SELECTOR, ROLE_COLORS, applyBadges, getRole, getAvatarUrl;
  var init_dom = __esm({
    "src/content/dom.ts"() {
      "use strict";
      init_config();
      MESSAGE_SELECTOR = [
        "yt-live-chat-text-message-renderer",
        "yt-live-chat-membership-item-renderer",
        "yt-live-chat-paid-message-renderer"
      ].join(", ");
      ROLE_COLORS = {
        moderator: "#4285f4",
        member: "#2ba640",
        owner: "#ffb300",
        viewer: "#ffffff"
      };
      applyBadges = (el) => {
        try {
          el.querySelectorAll(
            "#author-badges, yt-live-chat-author-badge-renderer, #chip-badges"
          ).forEach((b) => {
            b.style.display = config.hideBadges ? "none" : "";
          });
          el.querySelectorAll("#author-photo").forEach((a) => {
            a.style.display = config.hideAvatars ? "none" : "";
          });
        } catch (e) {
        }
      };
      getRole = (el) => {
        if (el.dataset.ytcccRole) return el.dataset.ytcccRole;
        if (el.querySelector('#author-badges [type="owner"]')) return "owner";
        if (el.querySelector('#author-badges [type="moderator"]')) return "moderator";
        if (el.querySelector('#author-badges [type="member"]')) return "member";
        return "viewer";
      };
      getAvatarUrl = (el) => {
        if (el.dataset.ytcccAvatar) return el.dataset.ytcccAvatar;
        try {
          const img = el.querySelector(
            "#author-photo img, #author-photo yt-img img"
          );
          if (img) {
            const src = img.src || img.getAttribute("data-src") || "";
            if (src.startsWith("http")) return src;
          }
        } catch (e) {
        }
        return null;
      };
    }
  });

  // src/content/toast.ts
  var injectToastStyles, initToasts, showToast;
  var init_toast = __esm({
    "src/content/toast.ts"() {
      "use strict";
      init_dom();
      injectToastStyles = () => {
        if (document.getElementById("ytccc-toast-styles")) return;
        const style = document.createElement("style");
        style.id = "ytccc-toast-styles";
        style.textContent = `
#ytccc-toasts {
  position: fixed;
  bottom: 72px;
  left: 12px;
  right: 12px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  font-family: Roboto, Arial, sans-serif;
}
.ytccc-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(32, 33, 36, 0.97);
  color: #e8eaed;
  padding: 12px 14px;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  animation: ytccc-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  transition: opacity 0.25s, transform 0.25s;
  will-change: transform, opacity;
  pointer-events: auto;
  cursor: default;
}
.ytccc-toast a {
  color: #8ab4f8;
  text-decoration: underline;
  word-break: break-all;
}
.ytccc-toast a:hover {
  color: #aecbfa;
}
.ytccc-toast img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #5f6368;
  object-fit: cover;
}
.ytccc-toast .ytccc-title {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.3;
}
.ytccc-toast .ytccc-body {
  font-size: 12px;
  color: #bdc1c6;
  line-height: 1.4;
  word-break: break-word;
}
.ytccc-toast.ytccc-out {
  opacity: 0;
  transform: translateX(110%);
}
@keyframes ytccc-slide-in {
  from { opacity: 0; transform: translateX(110%); }
  to { opacity: 1; transform: none; }
}`;
        document.documentElement.appendChild(style);
      };
      initToasts = () => {
        injectToastStyles();
      };
      showToast = (opts) => {
        const { title, body, avatar, role, duration } = opts;
        try {
          let container = document.getElementById("ytccc-toasts");
          if (!container) {
            container = document.createElement("div");
            container.id = "ytccc-toasts";
            document.body.appendChild(container);
          }
          while (container.children.length >= 4) {
            container.firstChild.remove();
          }
          const toast = document.createElement("div");
          toast.className = "ytccc-toast";
          if (avatar) {
            const img = document.createElement("img");
            img.src = avatar;
            img.alt = "";
            toast.appendChild(img);
          }
          const content = document.createElement("div");
          const titleEl = document.createElement("div");
          titleEl.className = "ytccc-title";
          titleEl.textContent = title;
          titleEl.style.color = ROLE_COLORS[role || "viewer"];
          const bodyEl = document.createElement("div");
          bodyEl.className = "ytccc-body";
          const urlRe = /https?:\/\/[^\s]+/gi;
          let lastIdx = 0;
          let m;
          while (m = urlRe.exec(body || "")) {
            if (m.index > lastIdx) {
              bodyEl.appendChild(document.createTextNode(body.slice(lastIdx, m.index)));
            }
            const href = m[0].replace(/[.,!?)\]]+$/, "");
            const a = document.createElement("a");
            a.href = href;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = href;
            bodyEl.appendChild(a);
            lastIdx = m.index + href.length;
          }
          if (lastIdx < (body || "").length) {
            bodyEl.appendChild(document.createTextNode(body.slice(lastIdx)));
          }
          content.appendChild(titleEl);
          content.appendChild(bodyEl);
          toast.appendChild(content);
          container.appendChild(toast);
          setTimeout(() => {
            toast.classList.add("ytccc-out");
            setTimeout(() => toast.remove(), 500);
          }, Math.max(1e3, Number(duration) || 2800));
        } catch (e) {
        }
      };
    }
  });

  // src/content/commands.ts
  var MODERATE_URL, REMOVE_LABELS, processed, getMessageText, isCommand, hideLocally, hiddenMessages, pruneHidden, revealHiddenMessages, sha1Hex, buildAuthHeader, waitForParams, pressEscape, scrollerClick, closeAnyMenus, deleteViaApi, tryMenuDelete, logMessage, processMessage;
  var init_commands = __esm({
    "src/content/commands.ts"() {
      "use strict";
      init_i18n();
      init_config();
      init_dom();
      init_logger();
      init_toast();
      MODERATE_URL = "https://www.youtube.com/youtubei/v1/live_chat/moderate?prettyPrint=false";
      REMOVE_LABELS = [
        "remove",
        "delete",
        "xo\xE1",
        "x\xF3a",
        "\u79FB\u9664",
        "\u524A\u9664",
        "\uC0AD\uC81C",
        "\u5220\u9664",
        "\u522A\u9664",
        "eliminar",
        "supprimer",
        "remover",
        "entfernen",
        "\u0443\u0434\u0430\u043B\u0438\u0442\u044C"
      ];
      processed = /* @__PURE__ */ new WeakSet();
      getMessageText = (el) => {
        const m = el.querySelector("#message") || el;
        return (m.textContent || "").trim();
      };
      isCommand = (text) => {
        if (!config.prefix) return false;
        return text.startsWith(config.prefix);
      };
      hideLocally = (el) => {
        el.style.display = "none";
        hiddenMessages.add(el);
        if (hiddenMessages.size > 500) pruneHidden();
      };
      hiddenMessages = /* @__PURE__ */ new Set();
      pruneHidden = () => {
        for (const el of hiddenMessages) {
          if (!el.isConnected) hiddenMessages.delete(el);
        }
      };
      revealHiddenMessages = () => {
        for (const el of hiddenMessages) {
          if (el.isConnected) el.style.display = "";
          hiddenMessages.delete(el);
        }
      };
      sha1Hex = async (str) => {
        const buf = await crypto.subtle.digest(
          "SHA-1",
          new TextEncoder().encode(str)
        );
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      };
      buildAuthHeader = async () => {
        const match = document.cookie.match(/(?:^|;\s*)SAPISID=([^;]+)/);
        if (!match) {
          log("SAPISID cookie not found (not logged in?)");
          return null;
        }
        const origin = `${location.protocol}//${location.host}`;
        const ts = Math.floor(Date.now() / 1e3);
        const hash = await sha1Hex(`${ts}_${match[1]}_${origin}`);
        return [
          `SAPISIDHASH ${ts}_${hash}`,
          `SAPISID1PHASH ${ts}_${hash}`,
          `SAPISID3PHASH ${ts}_${hash}`
        ].join(" ");
      };
      waitForParams = async (el, timeoutMs = 2500) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          if (el.dataset.ytcccParams) return el.dataset.ytcccParams;
          await sleep(120);
        }
        return null;
      };
      pressEscape = () => {
        try {
          for (const type of ["keydown", "keyup"]) {
            document.dispatchEvent(
              new KeyboardEvent(type, {
                key: "Escape",
                keyCode: 27,
                bubbles: true,
                cancelable: true
              })
            );
          }
        } catch (e) {
        }
      };
      scrollerClick = () => {
        try {
          const scroller = document.querySelector("#item-scroller, #chat-items");
          if (scroller)
            scroller.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        } catch (e) {
        }
      };
      closeAnyMenus = (toggleBtn) => {
        scrollerClick();
        pressEscape();
        if (toggleBtn) {
          try {
            toggleBtn.click();
          } catch (e) {
          }
          pressEscape();
        }
      };
      deleteViaApi = async (el, params) => {
        const root = document.documentElement;
        const clientVersion = root.dataset.ytcccClientVersion;
        const visitorData = root.dataset.ytcccVisitorData;
        if (!clientVersion) {
          log("missing clientVersion - skip API");
          return false;
        }
        try {
          const headers = {
            "content-type": "application/json",
            "x-origin": `${location.protocol}//${location.host}`,
            "x-youtube-client-name": "1",
            "x-youtube-client-version": clientVersion,
            "x-goog-authuser": "0"
          };
          if (visitorData) headers["x-goog-visitor-id"] = visitorData;
          const auth = await buildAuthHeader();
          if (auth) headers.authorization = auth;
          const client = {
            clientName: "WEB",
            clientVersion,
            hl: root.dataset.ytcccHl || "vi",
            gl: root.dataset.ytcccGl || "VN"
          };
          if (visitorData) client.visitorData = visitorData;
          const body = {
            context: { client },
            params
          };
          const res = await fetch(MODERATE_URL, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify(body)
          });
          log("moderate API status:", res.status);
          if (!res.ok) log("moderate API body:", (await res.text()).slice(0, 300));
          return res.ok;
        } catch (e) {
          log("moderate API error:", e?.message);
          return false;
        }
      };
      tryMenuDelete = async (el) => {
        try {
          const menuBtn = el.querySelector("#menu button, #menu yt-icon-button");
          if (!menuBtn) return false;
          menuBtn.click();
          const root = document.querySelector("yt-live-chat-app") || document;
          const deadline = Date.now() + 1500;
          while (Date.now() < deadline) {
            const items = root.querySelectorAll(
              "tp-yt-paper-item, yt-dropdown-menu .dropdown-content paper-item, .dropdown-content tp-yt-paper-item"
            );
            for (const item of items) {
              if (!item.offsetParent && item.getClientRects().length === 0)
                continue;
              const label = (item.textContent || "").trim().toLowerCase();
              if (label && REMOVE_LABELS.includes(label)) {
                item.click();
                closeAnyMenus();
                log("deleted via menu click");
                return true;
              }
            }
            await sleep(100);
          }
          closeAnyMenus();
          return false;
        } catch (e) {
          log("menu delete error:", e?.message);
          closeAnyMenus();
          return false;
        }
      };
      logMessage = async (author, text, role, avatar) => {
        try {
          const stored = await chrome.storage.local.get("deletedLog") || {};
          const deletedLog = stored.deletedLog || [];
          deletedLog.unshift({ author, text, at: Date.now(), role, avatar });
          await chrome.storage.local.set({ deletedLog: deletedLog.slice(0, 200) });
        } catch (e) {
          log("log error:", e?.message);
        }
      };
      processMessage = async (el) => {
        if (processed.has(el)) return;
        if (!config.enabled) return;
        const text = getMessageText(el);
        const author = el.querySelector("#author-name")?.textContent?.trim() || t("unknownAuthor");
        if (isBot(author)) {
          processed.add(el);
          log("hide bot:", author);
          hideLocally(el);
          if ((config.botToastSeconds || 0) > 0) {
            showToast({
              title: author,
              body: text.slice(0, 80) || t("botMessagePlaceholder"),
              avatar: getAvatarUrl(el),
              role: getRole(el),
              duration: (config.botToastSeconds || 10) * 1e3
            });
          }
          return;
        }
        if (!isCommand(text)) return;
        processed.add(el);
        const avatar = getAvatarUrl(el);
        const role = getRole(el);
        log("command detected:", author, ":", text.slice(0, 60));
        await logMessage(author, text, role, avatar);
        const params = await waitForParams(el);
        let ok = false;
        if (params) {
          ok = await deleteViaApi(el, params);
          if (!ok) ok = await tryMenuDelete(el);
        } else {
          ok = await tryMenuDelete(el);
          if (!ok && el.querySelector("#menu button, #menu yt-icon-button")) {
            const retry = await waitForParams(el, 1500);
            if (retry && retry !== params) ok = await deleteViaApi(el, retry);
          }
        }
        hideLocally(el);
        if (ok) {
          showToast({
            title: author,
            body: t("cleanedPrefix", { text: text.slice(0, 60) }),
            avatar,
            role
          });
        } else {
          log("could not delete - hidden silently:", author);
        }
      };
    }
  });

  // src/content/emotes.ts
  var emotes, customEmotes, sevenTvEmotes, emotePattern, emoteKeywordSet, emoteKeywordMap, emoteUrls, EMOTE_TEXT_SELECTOR, SEVEN_TV_API, extResource, escapeRegex, buildPattern, parseEmotes, loadEmotes, build7tvUrl, parse7tvSetIds, fetch7tvSet, load7tvEmotes, getEmotes, getCustomEmotes, emoteSrc, applyEmotes;
  var init_emotes = __esm({
    "src/content/emotes.ts"() {
      "use strict";
      init_logger();
      emotes = [];
      customEmotes = [];
      sevenTvEmotes = [];
      emotePattern = null;
      emoteKeywordSet = /* @__PURE__ */ new Set();
      emoteKeywordMap = /* @__PURE__ */ new Map();
      emoteUrls = {};
      EMOTE_TEXT_SELECTOR = "#message, #content-text";
      SEVEN_TV_API = "https://7tv.io/v3";
      extResource = (path) => new Promise((resolve) => {
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
          log("sendMessage fail:", e?.message);
          resolve(null);
        }
      });
      escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      buildPattern = () => {
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
        const names = emotes.map((e) => e.keyword).sort((a, b) => b.length - a.length).map(escapeRegex);
        emotePattern = new RegExp(
          "(?<![\\p{L}\\p{N}_])(" + names.join("|") + ")(?![\\p{L}\\p{N}_])",
          "gu"
        );
      };
      parseEmotes = (data) => (Array.isArray(data) ? data : []).map((item) => {
        if (Array.isArray(item)) {
          return { keyword: String(item[0] || ""), file: String(item[1] || "") };
        }
        if (item && typeof item === "object") {
          const o = item;
          return {
            keyword: String(o.name || o.keyword || ""),
            file: String(o.path || o.file || "")
          };
        }
        return null;
      }).filter((e) => !!(e && e.keyword && e.file));
      loadEmotes = async () => {
        let data = null;
        const text = await extResource("emotes.json");
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            log("emotes.json parse fail:", e?.message);
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
        void load7tvEmotes();
      };
      build7tvUrl = (host) => {
        try {
          const files = host.files || [];
          const pick = files.find((f) => f.name === "2x.webp") || files.find((f) => f.format === "WEBP") || files[0];
          if (!pick || !pick.name) return null;
          const base = (host.url || "").startsWith("//") ? "https:" + host.url : host.url || "";
          return `${base}/${pick.name}`;
        } catch (e) {
          return null;
        }
      };
      parse7tvSetIds = (raw) => raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).map((token) => {
        const at = token.indexOf("/emote-sets/");
        return at >= 0 ? token.slice(at + "/emote-sets/".length).replace(/[^0-9A-Za-z]+$/, "") : token;
      });
      fetch7tvSet = async (id) => {
        try {
          const res = await fetch(`${SEVEN_TV_API}/emote-sets/${id}`);
          if (!res.ok) {
            log("7tv set", id, "status:", res.status);
            return null;
          }
          return await res.json();
        } catch (e) {
          log("7tv set", id, "error:", e?.message);
          return null;
        }
      };
      load7tvEmotes = async () => {
        let raw = "";
        try {
          const stored = await chrome.storage.sync.get("emoteSetIds");
          raw = String(stored.emoteSetIds || "");
        } catch (e) {
        }
        const ids = ["global", ...parse7tvSetIds(raw)];
        const sets = await Promise.all(ids.map((id) => fetch7tvSet(id)));
        const existing = new Set(emotes.map((e) => e.keyword.toLowerCase()));
        const added = [];
        for (const set of sets) {
          if (!set || !Array.isArray(set.emotes)) continue;
          for (const rawEmote of set.emotes) {
            const o = rawEmote;
            const name = o?.name || "";
            const url = o?.data?.host ? build7tvUrl(o.data.host) : null;
            if (!name || !url) continue;
            const key = name.toLowerCase();
            if (existing.has(key)) continue;
            existing.add(key);
            emoteUrls[url] = url;
            added.push({ keyword: name, file: url });
          }
        }
        if (!added.length) return;
        sevenTvEmotes = added;
        emotes = [...customEmotes, ...sevenTvEmotes];
        buildPattern();
        log("7tv emotes loaded:", added.length, "(total:", emotes.length, ")");
      };
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync" && changes.emoteSetIds) void load7tvEmotes();
      });
      getEmotes = () => emotes;
      getCustomEmotes = () => customEmotes;
      emoteSrc = (emote) => emote && emote.file ? emoteUrls[emote.file] || "" : "";
      applyEmotes = (el) => {
        const message = el.matches("#content-text") ? el : el.querySelector("#message");
        if (!message || !emotePattern) return;
        const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT);
        const targets = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const val = node.nodeValue || "";
          if (val.includes("\u200B")) continue;
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
          let m;
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
              img.style.cssText = "display:inline-block;vertical-align:middle;height:1.4em;max-width:6em;margin:0 2px;border-radius:2px;";
              frag.appendChild(img);
            } else {
              frag.appendChild(document.createTextNode(m[0]));
            }
            last = m.index + m[0].length;
          }
          if (last < text.length) {
            frag.appendChild(document.createTextNode(text.slice(last)));
          }
          node.parentNode.replaceChild(frag, node);
        }
      };
    }
  });

  // src/content/suggest.ts
  var lastField, getInputField, stripInvisibleTail, placeCaretEnd, buildEmoteFrag, insertEmote, catalogBound, injectIntoCatalog, pickerEl, pickerItems, pickerIndex, closePicker, lastTextNode, isTailAfterEmoteImg, positionPicker, highlightPicker, renderPicker, updatePickerFromField, emoteBlockBefore, revertEmoteBlock, revertExtendedEmote, restoreEmoteToText, flushEmoteField, flushing, flushActiveField, tryAutoComplete, tabComplete, fieldFromEvent, isInputField, onFieldInput, initSuggest;
  var init_suggest = __esm({
    "src/content/suggest.ts"() {
      "use strict";
      init_emotes();
      init_logger();
      lastField = null;
      getInputField = () => {
        return document.querySelector(
          "yt-live-chat-message-input-renderer [contenteditable='true']"
        ) || document.querySelector("#textbox") || document.querySelector("#input");
      };
      stripInvisibleTail = (s) => (s || "").replace(/[\u200b-\u200f\u202a-\u202e\ufeff\u00a0\s]+$/, "");
      placeCaretEnd = (field) => {
        const range = document.createRange();
        range.selectNodeContents(field);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      };
      buildEmoteFrag = (kw, addSpace) => {
        const frag = document.createDocumentFragment();
        const img = document.createElement("img");
        img.src = emoteSrc(kw);
        img.alt = kw.keyword;
        img.dataset.ytcccKeyword = kw.keyword;
        img.style.cssText = "display:inline-block;vertical-align:middle;height:1.4em;max-width:6em;margin:0 2px;border-radius:3px;";
        frag.appendChild(img);
        const hidden = document.createElement("span");
        hidden.style.cssText = "font-size:1px;color:transparent;line-height:0;vertical-align:middle;letter-spacing:0;";
        hidden.textContent = "\u200B" + kw.keyword + "\u200B";
        frag.appendChild(hidden);
        if (addSpace) frag.appendChild(document.createTextNode("\xA0"));
        return frag;
      };
      insertEmote = (keyword) => {
        const field = lastField || getInputField();
        if (!field) return;
        const kw = getEmotes().find(
          (e) => e.keyword.toLowerCase() === keyword.toLowerCase()
        );
        if (!kw || !emoteSrc(kw)) return;
        try {
          const sel = window.getSelection();
          if (sel && sel.isCollapsed && sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE && field.contains(sel.anchorNode)) {
            const anchor = sel.anchorNode;
            const before = (anchor.nodeValue || "").slice(0, sel.anchorOffset);
            const m = before.match(/\|[^\s|]*$/);
            const range = document.createRange();
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
        }
        const current2 = stripInvisibleTail(field.textContent || "");
        const m2 = current2.match(/\|([^\s|]*)$/);
        const base = m2 ? current2.slice(0, current2.length - m2[0].length) : current2;
        field.textContent = base;
        field.appendChild(buildEmoteFrag(kw, true));
        placeCaretEnd(field);
        field.focus();
      };
      catalogBound = /* @__PURE__ */ new WeakSet();
      injectIntoCatalog = () => {
        const catalogEmotes = [...getCustomEmotes()];
        if (!catalogEmotes.length) return;
        const picker = document.querySelector("yt-live-chat-emoji-picker-renderer") || document.querySelector("tp-yt-emoji-picker-renderer") || document.querySelector("[emoji-picker], #emoji-picker");
        if (!picker) return;
        let container = null;
        const firstEmoji = picker.querySelector(
          "tp-yt-emoji, yt-emoji-picker-emoji-renderer, [data-emoji-id], .emoji"
        );
        if (firstEmoji && firstEmoji.parentElement) {
          container = firstEmoji.parentElement.parentElement || firstEmoji.parentElement;
        } else {
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
            if (c) {
              container = c;
              break;
            }
          }
        }
        if (!container) return;
        if (!catalogBound.has(picker)) {
          picker.addEventListener("mousedown", (e) => {
            const item = e.target.closest?.(".ytccc-custom-emoji");
            if (!item) return;
            e.preventDefault();
            e.stopPropagation();
            insertEmote(item.dataset.keyword || "");
          });
          catalogBound.add(picker);
        }
        let section = container.querySelector(".ytccc-catalog-section");
        if (!section) {
          section = document.createElement("div");
          section.className = "ytccc-catalog-section";
          section.style.cssText = "display:flex;flex-wrap:wrap;gap:2px;padding:8px;border-top:1px solid rgba(255,255,255,0.08);";
          container.appendChild(section);
        }
        if (section.dataset.emoteCount === String(catalogEmotes.length) && section.children.length >= catalogEmotes.length) {
          const imgs = section.querySelectorAll("img");
          if (imgs.length === catalogEmotes.length) return;
        }
        section.textContent = "";
        catalogEmotes.forEach((em) => {
          const item = document.createElement("div");
          item.className = "ytccc-custom-emoji";
          item.dataset.keyword = em.keyword;
          item.title = `|${em.keyword}`;
          item.style.cssText = "width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;";
          const img = document.createElement("img");
          img.src = emoteSrc(em);
          img.alt = em.keyword;
          img.loading = "lazy";
          img.style.cssText = "width:24px;height:24px;object-fit:contain;";
          item.appendChild(img);
          section.appendChild(item);
        });
      };
      pickerEl = null;
      pickerItems = [];
      pickerIndex = 0;
      closePicker = () => {
        if (pickerEl) {
          pickerEl.remove();
          pickerEl = null;
        }
        pickerItems = [];
        pickerIndex = 0;
      };
      lastTextNode = (field) => {
        let last = null;
        const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) last = walker.currentNode;
        return last;
      };
      isTailAfterEmoteImg = (field) => {
        const n = lastTextNode(field);
        const prev = n && n.previousSibling;
        return !!(prev && prev.tagName === "IMG" && prev.dataset && prev.dataset.ytcccKeyword);
      };
      positionPicker = (field) => {
        if (!pickerEl || !field || !field.getBoundingClientRect) return;
        const rect = field.getBoundingClientRect();
        pickerEl.style.left = Math.max(8, rect.left) + "px";
        pickerEl.style.top = Math.max(8, rect.top - 8) + "px";
      };
      highlightPicker = () => {
        if (!pickerEl) return;
        Array.from(pickerEl.children).forEach((child, i) => {
          child.style.background = i === pickerIndex ? "rgba(138, 180, 248, 0.18)" : "transparent";
        });
      };
      renderPicker = (field, matches) => {
        if (!matches.length) {
          closePicker();
          return;
        }
        pickerItems = matches;
        pickerIndex = 0;
        if (!pickerEl) {
          pickerEl = document.createElement("div");
          pickerEl.id = "ytccc-emote-picker";
          pickerEl.style.cssText = "position:fixed;z-index:2147483647;background:#202124;border:1px solid #3c4043;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.5);padding:6px;display:flex;flex-direction:column;gap:2px;transform:translateY(-100%);max-width:280px;font-family:Roboto,Arial,sans-serif;";
          document.body.appendChild(pickerEl);
          pickerEl.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const item = e.target.closest?.("[data-keyword]");
            if (item) insertEmote(item.dataset.keyword || "");
            closePicker();
          });
        } else {
          pickerEl.textContent = "";
        }
        matches.forEach((emote) => {
          const item = document.createElement("div");
          item.dataset.keyword = emote.keyword;
          item.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;cursor:pointer;color:#e8eaed;font-size:13px;";
          const img = document.createElement("img");
          img.src = emoteSrc(emote);
          img.alt = "";
          img.style.cssText = "width:22px;height:22px;object-fit:contain;border-radius:3px;flex-shrink:0;";
          const label = document.createElement("span");
          label.textContent = emote.keyword;
          item.appendChild(img);
          item.appendChild(label);
          pickerEl.appendChild(item);
        });
        positionPicker(field);
        highlightPicker();
      };
      updatePickerFromField = (field) => {
        if (!field) return;
        if (isTailAfterEmoteImg(field)) {
          closePicker();
          return;
        }
        const current2 = stripInvisibleTail(field.textContent || "");
        const m = current2.match(/\|([^\s|]*)$/);
        const all = getEmotes();
        if (!m || !all.length || !m[1]) {
          closePicker();
          return;
        }
        const q = m[1].toLowerCase();
        const matches = all.filter((e) => e.keyword.toLowerCase().startsWith(q)).slice(0, 12);
        renderPicker(field, matches);
      };
      emoteBlockBefore = (node) => {
        const prev = node.previousSibling;
        if (!prev || prev.nodeType !== Node.ELEMENT_NODE) return null;
        const span = prev;
        if (span.tagName !== "SPAN") return null;
        const img = span.previousSibling;
        if (!img || img.nodeType !== Node.ELEMENT_NODE) return null;
        if (!img.dataset || !img.dataset.ytcccKeyword) return null;
        return span;
      };
      revertEmoteBlock = (field, span, caretNode, caretOff) => {
        const img = span.previousSibling;
        const kw = (img.dataset.ytcccKeyword || "").replace(/\u200b/g, "");
        const text = document.createTextNode(kw);
        span.parentNode.replaceChild(text, span);
        img.remove();
        let typed = 0;
        if (caretNode && caretNode.nodeType === Node.TEXT_NODE && caretNode.parentNode === text.parentNode) {
          const val = caretNode.nodeValue || "";
          const off = Math.min(caretOff ?? val.length, val.length);
          typed = val.slice(0, off).replace(/\u200b/g, "").length;
        }
        const cur = text;
        while (cur.nextSibling && cur.nextSibling.nodeType === Node.TEXT_NODE) {
          const nx = cur.nextSibling;
          cur.nodeValue = (cur.nodeValue || "") + (nx.nodeValue || "").replace(/\u200b/g, "");
          nx.remove();
        }
        const caretPos = Math.min(kw.length + typed, (cur.nodeValue || "").length);
        const range = document.createRange();
        range.setStart(cur, caretPos);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      };
      revertExtendedEmote = (field) => {
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
      restoreEmoteToText = (field) => {
        if (!field) return false;
        const sel = window.getSelection();
        if (!sel || !sel.isCollapsed || !sel.anchorNode || !field.contains(sel.anchorNode)) return false;
        const node = sel.anchorNode;
        if (node.nodeType !== Node.TEXT_NODE) return false;
        const val = node.nodeValue || "";
        const off = sel.anchorOffset;
        let span = null;
        if (off === 0) span = emoteBlockBefore(node);
        else if (off === val.length && val === "\u200B") span = emoteBlockBefore(node);
        if (!span) return false;
        revertEmoteBlock(field, span);
        return true;
      };
      flushEmoteField = (field) => {
        if (!field) return;
        const imgs = Array.from(
          field.querySelectorAll("img[data-ytccc-keyword]")
        );
        for (const img of imgs) {
          const span = img.nextSibling;
          if (span && span.nodeType === Node.ELEMENT_NODE && span.tagName === "SPAN") {
            const kw = (img.dataset.ytcccKeyword || "").replace(/\u200b/g, "");
            span.parentNode.replaceChild(document.createTextNode(kw), span);
          }
          img.remove();
        }
        const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const n of nodes) {
          const v = n.nodeValue || "";
          const cleaned = v.replace(/\u200b/g, "");
          if (!cleaned) n.remove();
          else if (cleaned !== v) n.nodeValue = cleaned;
        }
      };
      flushing = false;
      flushActiveField = (field) => {
        const f = field || lastField || getInputField();
        if (!f) return;
        flushEmoteField(f);
        flushing = true;
        try {
          f.dispatchEvent(
            new InputEvent("input", { bubbles: true, composed: true })
          );
        } catch {
        }
        flushing = false;
      };
      tryAutoComplete = (field) => {
        const all = getEmotes();
        if (!field || !all.length) return false;
        const current2 = stripInvisibleTail(field.textContent || "");
        const m = current2.match(/\|([^\s|]+)$/);
        const node = lastTextNode(field);
        if (!node) return false;
        const val = node.nodeValue || "";
        let tail;
        let idx;
        if (m) {
          tail = m[1];
          idx = val.toLowerCase().lastIndexOf("|" + tail.toLowerCase());
          if (idx === -1) return false;
          idx += 1;
        } else {
          const clean = val.replace(/\u200b/g, "");
          const bm = clean.match(/([^\s|]+)$/);
          if (!bm) return false;
          tail = bm[1];
          idx = val.toLowerCase().lastIndexOf(tail.toLowerCase());
          if (idx === -1) return false;
        }
        const kw = all.find((e) => e.keyword.toLowerCase() === tail.toLowerCase());
        if (!kw) return false;
        const src = emoteSrc(kw);
        if (!src) return false;
        const before = val.slice(0, idx);
        const after = val.slice(idx + tail.length);
        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(buildEmoteFrag(kw, !!m));
        if (after) {
          frag.appendChild(document.createTextNode(after));
        } else if (!m) {
          frag.appendChild(document.createTextNode("\u200B"));
        }
        node.parentNode.replaceChild(frag, node);
        placeCaretEnd(field);
        closePicker();
        return true;
      };
      tabComplete = (field) => {
        const all = getEmotes();
        if (!field || !all.length) return false;
        const current2 = stripInvisibleTail(field.textContent || "");
        const m = current2.match(/\|([^\s|]*)$/);
        if (!m) return false;
        const q = m[1].toLowerCase();
        const hit = all.find((x) => x.keyword.toLowerCase().startsWith(q));
        if (!hit) return false;
        insertEmote(hit.keyword);
        closePicker();
        return true;
      };
      fieldFromEvent = (e) => {
        if (e.composedPath && typeof e.composedPath === "function") {
          const p = e.composedPath();
          if (p && p.length) return p[0];
        }
        return e.target;
      };
      isInputField = (field) => !!(field && field.closest && field.closest("#input, #textbox, yt-live-chat-message-input-renderer"));
      onFieldInput = (e) => {
        if (flushing) return;
        const field = fieldFromEvent(e);
        if (!isInputField(field)) return;
        lastField = field;
        revertExtendedEmote(field);
        tryAutoComplete(field);
        updatePickerFromField(field);
      };
      initSuggest = () => {
        document.addEventListener("input", onFieldInput, true);
        document.addEventListener("compositionend", onFieldInput, true);
        window.addEventListener(
          "keydown",
          (e) => {
            const field = fieldFromEvent(e);
            if (!isInputField(field)) return;
            lastField = field;
            if (e.key === "Backspace") {
              if (restoreEmoteToText(field)) {
                e.preventDefault();
                e.stopPropagation();
              }
              return;
            }
            const pickerOpen = !!(pickerEl && pickerItems.length);
            if (e.key === "Tab") {
              e.preventDefault();
              e.stopPropagation();
              if (pickerOpen) {
                insertEmote(pickerItems[pickerIndex].keyword);
                closePicker();
              } else {
                tabComplete(field);
              }
              return;
            }
            if (!pickerOpen) {
              if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                flushActiveField(field);
              }
              return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const dir = e.key === "ArrowDown" ? 1 : -1;
              pickerIndex = (pickerIndex + dir + pickerItems.length) % pickerItems.length;
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
        window.addEventListener(
          "beforeinput",
          (e) => {
            const type = e.inputType || "";
            if (type !== "insertLineBreak" && type !== "insertParagraph") return;
            const field = fieldFromEvent(e);
            if (isInputField(field)) flushActiveField(field);
          },
          true
        );
        window.addEventListener(
          "click",
          (e) => {
            const t2 = e.target;
            if (!t2 || typeof t2.closest !== "function") return;
            if (t2.closest(
              "#send-button, #button-send, yt-live-chat-message-input-renderer #button.send"
            )) {
              flushActiveField();
            }
          },
          true
        );
        document.addEventListener(
          "click",
          (e) => {
            if (!pickerEl || pickerEl.contains(e.target)) return;
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
        document.addEventListener(
          "click",
          (e) => {
            const field = fieldFromEvent(e);
            if (field && field.closest && field.closest("#input, #textbox, yt-live-chat-message-input-renderer")) {
              lastField = field;
            }
          },
          true
        );
        log("suggest module ready");
      };
    }
  });

  // src/content/curtain.ts
  var LIVE_CHAT_MODE_LABELS, switchState, switchRunning, setSwitchState, getSwitchState, curtainEl, curtainSafety, fetchExtensionIcon, showChatCurtain, revealChatCurtain, findModeTrigger, switchCycle, ensureSwitchLoop;
  var init_curtain = __esm({
    "src/content/curtain.ts"() {
      "use strict";
      init_config();
      init_commands();
      init_logger();
      LIVE_CHAT_MODE_LABELS = /^(trò chuyện trực tiếp|live chat)\b/i;
      switchState = "unknown";
      switchRunning = false;
      setSwitchState = (state) => {
        switchState = state;
        try {
          chrome.storage.local.set({ switchStatus: { state, at: Date.now() } });
        } catch (e) {
        }
        try {
          const p = chrome.runtime.sendMessage({ type: "ytccc-switch-status", state });
          if (p && typeof p.catch === "function")
            p.catch(() => {
            });
        } catch (e) {
        }
        if (state === "done" || state === "failed" || state === "off")
          revealChatCurtain();
      };
      getSwitchState = () => switchState;
      curtainEl = null;
      curtainSafety = null;
      fetchExtensionIcon = () => new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(
            { type: "ytccc-get-resource", path: "icons/icon128.png" },
            (res) => {
              if (chrome.runtime.lastError) {
                resolve(null);
                return;
              }
              resolve(res && res.ok ? res.dataUrl || null : null);
            }
          );
        } catch (e) {
          resolve(null);
        }
      });
      showChatCurtain = () => {
        if (!config.autoLiveChat) return;
        if (curtainEl) return;
        if (!document.getElementById("ytccc-curtain-style")) {
          const style = document.createElement("style");
          style.id = "ytccc-curtain-style";
          style.textContent = `
#ytccc-curtain {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: #010102;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1), transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
}
#ytccc-curtain.ytccc-curtain-out {
  opacity: 0;
  transform: scale(1.15);
  pointer-events: none;
}
.ytccc-curtain-spin-wrap {
  width: 56px;
  height: 56px;
  animation: ytccc-curtain-spin 1.6s linear infinite;
}
.ytccc-curtain-spin-wrap img,
.ytccc-curtain-spin-wrap .ytccc-curtain-fallback {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ytccc-curtain-spin-wrap img {
  border-radius: 0;
}
.ytccc-curtain-fallback {
  border: 3px solid #23252a;
  border-top-color: #5e6ad2;
  border-radius: 50%;
  display: block;
}
@keyframes ytccc-curtain-spin {
  to { transform: rotate(360deg); }
}`;
          document.documentElement.appendChild(style);
        }
        curtainEl = document.createElement("div");
        curtainEl.id = "ytccc-curtain";
        const spinner = document.createElement("div");
        spinner.className = "ytccc-curtain-spin-wrap";
        curtainEl.appendChild(spinner);
        document.body.appendChild(curtainEl);
        void fetchExtensionIcon().then((dataUrl) => {
          if (!curtainEl || !dataUrl) return;
          const img = document.createElement("img");
          img.src = dataUrl;
          img.alt = "";
          spinner.textContent = "";
          spinner.appendChild(img);
        });
        if (curtainSafety) clearTimeout(curtainSafety);
        curtainSafety = setTimeout(revealChatCurtain, 3e4);
      };
      revealChatCurtain = () => {
        if (curtainSafety) clearTimeout(curtainSafety);
        const el = curtainEl;
        if (!el) return;
        curtainEl = null;
        el.classList.add("ytccc-curtain-out");
        setTimeout(() => el.remove(), 750);
      };
      findModeTrigger = () => {
        const header = document.querySelector("yt-live-chat-header-renderer") || document.querySelector("yt-live-chat-app");
        if (!header) return null;
        let deepest = null;
        header.querySelectorAll("*").forEach((el) => {
          if (el.offsetParent === null && el.tagName !== "BODY") return;
          const label = (el.textContent || "").trim();
          if (!label || label.length > 40 || !LIVE_CHAT_MODE_LABELS.test(label)) return;
          if (!deepest || deepest.contains(el)) deepest = el;
        });
        if (!deepest) return null;
        const found = deepest;
        let node = found;
        for (let i = 0; i < 6 && node; i++) {
          const tag = (node.tagName || "").toUpperCase();
          if (tag.includes("BUTTON") || tag.includes("DROPDOWN") || node.getAttribute("role") === "button" || node.getAttribute("aria-haspopup")) {
            return node;
          }
          node = node.parentElement;
        }
        return found;
      };
      switchCycle = async () => {
        const trigger = findModeTrigger();
        let openedVia = null;
        if (trigger) {
          openedVia = trigger;
          trigger.click();
        } else {
          const header = document.querySelector("yt-live-chat-header-renderer");
          const ovf = header && header.querySelector("#overflow button, #overflow, #menu-button button, #menu-button");
          if (!ovf) {
            log("mode trigger not found");
            return "retry";
          }
          openedVia = ovf;
          ovf.click();
        }
        const root = document.querySelector("yt-live-chat-app") || document;
        const deadline = Date.now() + 2e3;
        let done = "retry";
        while (Date.now() < deadline && done === "retry") {
          const items = root.querySelectorAll(
            "tp-yt-paper-item, paper-item, [role='menuitem'], [role='option'], yt-dropdown-menu .dropdown-content > *"
          );
          for (const item of items) {
            const label = (item.textContent || "").trim();
            if (!label || !LIVE_CHAT_MODE_LABELS.test(label)) continue;
            if (item.hasAttribute("disabled") || item.getAttribute("aria-checked") === "true" || item.getAttribute("checked") !== null) {
              log('"Live chat" mode already active');
              done = "active";
              break;
            }
            item.click();
            log('switched to "Live chat" mode');
            done = "clicked";
            break;
          }
          if (done === "retry") await sleep(150);
        }
        if (done === "retry") closeAnyMenus(openedVia);
        else closeAnyMenus();
        return done;
      };
      ensureSwitchLoop = async () => {
        if (switchRunning || !config.autoLiveChat) return;
        if (!document.querySelector("yt-live-chat-app, #chat-items")) return;
        switchRunning = true;
        setSwitchState("switching");
        showChatCurtain();
        let result = "failed";
        for (let attempt = 0; attempt < 8; attempt++) {
          await sleep(2500 + attempt * 500);
          if (!config.autoLiveChat) {
            result = "off";
            break;
          }
          const outcome = await switchCycle();
          if (outcome === "active" || outcome === "clicked") {
            result = "done";
            break;
          }
        }
        setSwitchState(result);
        switchRunning = false;
      };
    }
  });

  // src/content/index.ts
  var require_index = __commonJS({
    "src/content/index.ts"() {
      init_config();
      init_commands();
      init_dom();
      init_emotes();
      init_suggest();
      init_curtain();
      init_toast();
      init_logger();
      var handleAddedNode = (node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node;
        if (el.matches && el.matches("yt-live-chat-emoji-picker-renderer")) {
          injectIntoCatalog();
        }
        if (el.querySelector && el.querySelector("yt-live-chat-emoji-picker-renderer")) {
          injectIntoCatalog();
        }
        if (el.matches && el.matches(MESSAGE_SELECTOR)) {
          applyBadges(el);
          void processMessage(el);
          applyEmotes(el);
        }
        if (el.matches && el.matches(EMOTE_TEXT_SELECTOR)) {
          applyEmotes(el);
        }
        if (el.querySelectorAll) {
          el.querySelectorAll(MESSAGE_SELECTOR).forEach((child) => {
            const msg = child;
            applyBadges(msg);
            void processMessage(msg);
            applyEmotes(msg);
          });
          el.querySelectorAll(EMOTE_TEXT_SELECTOR).forEach((t2) => {
            const target = t2;
            if (target !== el) applyEmotes(target);
          });
        }
      };
      var boot = () => {
        if (!document.querySelector("yt-live-chat-app, #chat-items")) return false;
        document.querySelectorAll(MESSAGE_SELECTOR).forEach((el) => {
          applyBadges(el);
          void processMessage(el);
          applyEmotes(el);
        });
        const emoteSweep = () => {
          document.querySelectorAll(MESSAGE_SELECTOR).forEach((el) => {
            applyBadges(el);
            applyEmotes(el);
          });
          document.querySelectorAll(EMOTE_TEXT_SELECTOR).forEach((el) => {
            if (el.matches("#content-text")) applyEmotes(el);
          });
          injectIntoCatalog();
        };
        setInterval(emoteSweep, 3e3);
        const target = document.body || document.documentElement;
        new MutationObserver((mutations) => {
          for (const m of mutations) {
            m.addedNodes.forEach(handleAddedNode);
            if (m.addedNodes.length && m.target && m.target.closest) {
              const msgEl = m.target.closest(MESSAGE_SELECTOR);
              if (msgEl) applyEmotes(msgEl);
            }
          }
        }).observe(target, { childList: true, subtree: true });
        log("started observing live chat:", location.href.slice(0, 80));
        void ensureSwitchLoop();
        return true;
      };
      var bootLoop = () => {
        if (boot()) return;
        const obs = new MutationObserver(() => {
          if (boot()) obs.disconnect();
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      };
      var main = async () => {
        await loadConfig();
        watchConfig();
        initToasts();
        initSuggest();
        const isChatFrame = location.hostname === "www.youtube.com" && location.pathname.startsWith("/live_chat");
        const isStudio = location.hostname === "studio.youtube.com";
        if (chrome.storage && chrome.storage.onChanged) {
          let sweepTimer;
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "sync") return;
            if (changes.enabled && changes.enabled.newValue === false) {
              revealHiddenMessages();
            }
            if (sweepTimer) window.clearTimeout(sweepTimer);
            sweepTimer = window.setTimeout(() => {
              document.querySelectorAll(MESSAGE_SELECTOR).forEach((el) => {
                applyBadges(el);
                applyEmotes(el);
              });
              document.querySelectorAll(EMOTE_TEXT_SELECTOR).forEach((el) => {
                if (el.matches("#content-text")) applyEmotes(el);
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
          setInterval(() => void loadEmotes(), 3e4);
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", bootLoop);
          } else {
            bootLoop();
          }
        }
      };
      void main();
    }
  });
  require_index();
})();
