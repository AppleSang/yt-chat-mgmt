"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/background/index.ts
  var require_index = __commonJS({
    "src/background/index.ts"() {
      var getResourceText = async (path) => {
        const url = chrome.runtime.getURL(path);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      };
      var getResourceDataUrl = async (path) => {
        const url = chrome.runtime.getURL(path);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("FileReader fail"));
          reader.readAsDataURL(blob);
        });
      };
      chrome.runtime.onMessage.addListener(
        (msg, sender, sendResponse) => {
          if (msg && msg.type === "ytccc-get-resource" && msg.path) {
            const respond = (p, key) => {
              p.then((v) => sendResponse({ ok: true, [key]: v })).catch(
                (e) => sendResponse({ ok: false, error: String(e?.message) })
              );
            };
            if (/\.json$/i.test(msg.path)) respond(getResourceText(msg.path), "text");
            else respond(getResourceDataUrl(msg.path), "dataUrl");
            return true;
          }
          if (msg && msg.type === "ytccc-request-check" && sender.tab && sender.tab.id != null) {
            chrome.tabs.sendMessage(sender.tab.id, { type: "ytccc-check-mode" }).catch(() => {
            });
          }
          return void 0;
        }
      );
      chrome.action.onClicked.addListener(() => {
        chrome.windows.create({
          url: chrome.runtime.getURL("popup/popup.html"),
          type: "popup",
          width: 400,
          height: 640,
          focused: true
        });
      });
    }
  });
  require_index();
})();
