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
        popupModPoll: 'Mods can create polls ("!poll")',
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
        cleanedPrefix: "Cleaned: {text}",
        modPollNotAllowed: "Only mods / the channel owner can create polls",
        modPollInvalid: "Syntax: !poll question // option 1 // option 2",
        modPollCreated: "Poll created",
        modPollFailed: "Could not create poll ({detail})"
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
        popupModPoll: "Mod c\xF3 th\u1EC3 t\u1EA1o cu\u1ED9c b\u1EA7u ch\u1ECDn (\u201C!poll\u201D)",
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
        cleanedPrefix: "\u0110\xE3 d\u1ECDn: {text}",
        modPollNotAllowed: "Ch\u1EC9 mod / ch\u1EE7 k\xEAnh m\u1EDBi \u0111\u01B0\u1EE3c t\u1EA1o b\xECnh ch\u1ECDn",
        modPollInvalid: "C\xFA ph\xE1p: !poll c\xE2u h\u1ECFi // l\u1EF1a ch\u1ECDn 1 // l\u1EF1a ch\u1ECDn 2",
        modPollCreated: "\u0110\xE3 t\u1EA1o cu\u1ED9c b\xECnh ch\u1ECDn",
        modPollFailed: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c b\xECnh ch\u1ECDn ({detail})"
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
        main: $("main"),
        language: $("language"),
        enabled: $("enabled"),
        autoLiveChat: $("autoLiveChat"),
        hideBadges: $("hideBadges"),
        hideAvatars: $("hideAvatars"),
        modPoll: $("modPoll"),
        botList: $("botList"),
        botToastSeconds: $("botToastSeconds"),
        botToastVal: $("botToastVal"),
        sevenTvSearch: $("sevenTvSearch"),
        sevenTvResults: $("sevenTvResults"),
        sevenTvAdded: $("sevenTvAdded"),
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
            modPoll: false,
            botList: "@nightbot, @streamelements, @streamlabs",
            botToastSeconds: 10,
            emoteSetIds: "",
            emoteUsers: []
          },
          (cfg) => {
            els.enabled.checked = !!cfg.enabled;
            els.autoLiveChat.checked = !!cfg.autoLiveChat;
            els.hideBadges.checked = !!cfg.hideBadges;
            els.hideAvatars.checked = !!cfg.hideAvatars;
            els.modPoll.checked = !!cfg.modPoll;
            els.botList.value = String(cfg.botList || "");
            const secs = Number(cfg.botToastSeconds);
            const safe = Number.isFinite(secs) ? Math.min(35, Math.max(0, Math.floor(secs))) : 10;
            els.botToastSeconds.value = String(safe);
            els.botToastVal.textContent = safe === 0 ? t("popupOff") : `${safe}s`;
            els.sevenTvSearch.value = "";
            els.sevenTvResults.dataset.ids = String(cfg.emoteSetIds || "");
            addedUsers = Array.isArray(cfg.emoteUsers) ? cfg.emoteUsers : [];
            renderAddedUsers();
          }
        );
        chrome.storage.local.get({ deletedLog: [] }, (d) => {
          const log = d.deletedLog || [];
          els.logCount.textContent = String(log.length).padStart(3, "0");
          renderLog(log.slice(0, 30));
        });
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
      els.modPoll.addEventListener(
        "change",
        () => save("modPoll", els.modPoll.checked)
      );
      els.botList.addEventListener(
        "change",
        () => save("botList", els.botList.value.trim())
      );
      els.botToastSeconds.addEventListener("input", () => {
        const v = Number(els.botToastSeconds.value) || 0;
        els.botToastVal.textContent = v === 0 ? t("popupOff") : `${v}s`;
        save("botToastSeconds", v);
      });
      els.clearLog.addEventListener("click", () => {
        chrome.storage.local.set({ deletedLog: [] }, () => loadAll());
      });
      var SEVEN_TV_GQL = "https://7tv.io/v3/gql";
      var SEVEN_TV_API = "https://7tv.io/v3";
      var USER_SEARCH_QUERY = "query($query:String!,$limit:Int){users(query:$query,limit:$limit){id username display_name avatar_url}}";
      var searchTimer;
      var searchSeq = 0;
      var addedUsers = [];
      var getSetIds = () => {
        try {
          const v = els.sevenTvResults.dataset.ids || "";
          return v.split(",").filter(Boolean);
        } catch (e) {
          return [];
        }
      };
      var saveSetIds = (ids) => {
        const unique = [...new Set(ids)].filter(Boolean);
        els.sevenTvResults.dataset.ids = unique.join(",");
        save("emoteSetIds", unique.join(","));
      };
      var saveAddedUsers = () => {
        save("emoteUsers", addedUsers);
      };
      var fetchUserSetIds = async (user) => {
        try {
          const res = await fetch(`${SEVEN_TV_API}/users/${user.id}`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data.emote_sets || []).map((s) => s.id).filter(Boolean);
        } catch (e) {
          return [];
        }
      };
      var renderAddedUsers = () => {
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
          del.textContent = "\u2212";
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
      var renderSearchResults = (users) => {
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
            els.sevenTvSearch.value = "";
            els.sevenTvResults.textContent = "";
          });
          row.appendChild(img);
          row.appendChild(name);
          row.appendChild(add);
          els.sevenTvResults.appendChild(row);
        }
      };
      var runUserSearch = async (query) => {
        const q = query.trim();
        if (q.length < 2) {
          els.sevenTvResults.textContent = "";
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
          const body = await res.json();
          if (seq !== searchSeq) return;
          renderSearchResults(body.data?.users || []);
        } catch (e) {
        }
      };
      els.sevenTvSearch.addEventListener("input", () => {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => void runUserSearch(els.sevenTvSearch.value), 350);
      });
      initLanguageSelect();
      loadLanguage(() => loadAll());
    }
  });
  require_popup();
})();
