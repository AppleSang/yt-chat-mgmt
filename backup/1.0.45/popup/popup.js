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
        popupBotToastTime: "Bot toast duration (max 35s):",
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
        popupBotToastTime: "Th\u1EDDi gian toast bot (t\u1ED1i \u0111a 35s):",
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
  var LOCALES, LANGUAGES, DEFAULT_LANGUAGE, current, isLanguageCode, setLanguage, getLanguage, t;
  var init_i18n = __esm({
    "src/shared/i18n.ts"() {
      "use strict";
      init_en();
      init_vi();
      LOCALES = { en, vi };
      LANGUAGES = [
        { code: "en", label: "English" },
        { code: "vi", label: "Ti\u1EBFng Vi\u1EC7t" }
      ];
      DEFAULT_LANGUAGE = "en";
      current = DEFAULT_LANGUAGE;
      isLanguageCode = (v) => typeof v === "string" && v in LOCALES;
      setLanguage = (code) => {
        current = isLanguageCode(code) ? code : DEFAULT_LANGUAGE;
        return current;
      };
      getLanguage = () => current;
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

  // src/popup/popup.ts
  var require_popup = __commonJS({
    "src/popup/popup.ts"() {
      init_i18n();
      var $ = (id) => document.getElementById(id);
      var els = {
        rev: $("rev"),
        main: $("main"),
        language: $("language"),
        enabled: $("enabled"),
        autoLiveChat: $("autoLiveChat"),
        hideBadges: $("hideBadges"),
        hideAvatars: $("hideAvatars"),
        botList: $("botList"),
        botToastSeconds: $("botToastSeconds"),
        botToastVal: $("botToastVal"),
        logCount: $("logCount"),
        logList: $("logList"),
        clearLog: $("clearLog")
      };
      var ROLE_COLORS = {
        owner: "role-owner",
        moderator: "role-moderator",
        member: "role-member",
        viewer: "role-viewer"
      };
      var ROLE_TAGS = {
        owner: { key: "roleOwner" },
        moderator: { key: "roleModerator" },
        member: { key: "roleMember" },
        viewer: { key: "roleViewer" }
      };
      var fmtTime = (ms) => {
        const d = new Date(ms);
        const p = (n) => String(n).padStart(2, "0");
        return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      };
      var makeAvatarPh = (author) => {
        const ph = document.createElement("div");
        ph.className = "ava-ph";
        ph.textContent = (author || "?").trim().charAt(0).toUpperCase() || "?";
        return ph;
      };
      var renderLog = (log) => {
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
      var applyI18n = () => {
        document.documentElement.lang = getLanguage();
        document.querySelectorAll("[data-i18n]").forEach((el) => {
          const key = el.dataset.i18n;
          el.textContent = t(key);
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
          const key = el.dataset.i18nPlaceholder;
          el.placeholder = t(key);
        });
      };
      var initLanguageSelect = () => {
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
        });
      };
      var loadLanguage = (cb) => {
        chrome.storage.sync.get({ language: DEFAULT_LANGUAGE }, (d) => {
          if (isLanguageCode(d.language)) setLanguage(d.language);
          els.language.value = getLanguage();
          applyI18n();
          cb();
        });
      };
      var loadAll = () => {
        chrome.storage.sync.get(
          {
            enabled: true,
            autoLiveChat: true,
            hideBadges: false,
            hideAvatars: false,
            botList: "@nightbot, @streamelements, @streamlabs",
            botToastSeconds: 10
          },
          (cfg) => {
            els.enabled.checked = !!cfg.enabled;
            els.autoLiveChat.checked = !!cfg.autoLiveChat;
            els.hideBadges.checked = !!cfg.hideBadges;
            els.hideAvatars.checked = !!cfg.hideAvatars;
            els.botList.value = String(cfg.botList || "");
            els.botToastSeconds.value = String(cfg.botToastSeconds || 10);
            els.botToastVal.textContent = `${cfg.botToastSeconds || 10}s`;
          }
        );
        chrome.storage.local.get({ deletedLog: [] }, (d) => {
          const log = d.deletedLog || [];
          els.logCount.textContent = String(log.length).padStart(3, "0");
          renderLog(log.slice(0, 30));
        });
        try {
          fetch(chrome.runtime.getURL("manifest.json")).then((r) => r.json()).then((m) => {
            els.rev.textContent = `REV ${m.version}`;
          }).catch(() => {
          });
        } catch (e) {
        }
      };
      var save = (key, value) => {
        chrome.storage.sync.set({ [key]: value });
      };
      els.enabled.addEventListener("change", () => save("enabled", els.enabled.checked));
      els.autoLiveChat.addEventListener(
        "change",
        () => save("autoLiveChat", els.autoLiveChat.checked)
      );
      els.hideBadges.addEventListener(
        "change",
        () => save("hideBadges", els.hideBadges.checked)
      );
      els.hideAvatars.addEventListener(
        "change",
        () => save("hideAvatars", els.hideAvatars.checked)
      );
      els.botList.addEventListener(
        "change",
        () => save("botList", els.botList.value.trim())
      );
      els.botToastSeconds.addEventListener("input", () => {
        const v = Number(els.botToastSeconds.value) || 10;
        els.botToastVal.textContent = `${v}s`;
        save("botToastSeconds", v);
      });
      els.clearLog.addEventListener("click", () => {
        chrome.storage.local.set({ deletedLog: [] }, () => loadAll());
      });
      initLanguageSelect();
      loadLanguage(() => loadAll());
    }
  });
  require_popup();
})();
