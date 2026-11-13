const getResourceText = async (path: string): Promise<string> => {
  const url = chrome.runtime.getURL(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

const getResourceDataUrl = async (path: string): Promise<string> => {
  const url = chrome.runtime.getURL(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader fail"));
    reader.readAsDataURL(blob);
  });
};

interface RuntimeMessage {
  type?: string;
  path?: string;
  id?: string;
}

chrome.runtime.onMessage.addListener(
  (msg: RuntimeMessage, sender, sendResponse) => {
    if (msg && msg.type === "ytccc-get-resource" && msg.path) {
      const respond = (p: Promise<string>, key: "text" | "dataUrl") => {
        p.then((v) => sendResponse({ ok: true, [key]: v })).catch((e) =>
          sendResponse({ ok: false, error: String((e as Error)?.message) })
        );
      };
      if (/\.json$/i.test(msg.path)) respond(getResourceText(msg.path), "text");
      else respond(getResourceDataUrl(msg.path), "dataUrl");
      return true;
    }
    // 7tv.io fetches run here, not in the page frame: content-script fetches
    // inside YouTube's live_chat frame get logged as "Unsafe attempt to load
    // URL" (frame origin check), while the service worker holds the host
    // permission and is not bound by the page's CSP.
    if (msg && msg.type === "ytccc-fetch-7tv" && msg.id) {
      fetch(`https://7tv.io/v3/emote-sets/${encodeURIComponent(msg.id)}`)
        .then(async (res) => {
          const data = res.ok ? await res.json() : null;
          sendResponse({ ok: res.ok, status: res.status, data });
        })
        .catch((e) =>
          sendResponse({ ok: false, error: String((e as Error)?.message) })
        );
      return true;
    }
    if (
      msg &&
      msg.type === "ytccc-request-check" &&
      sender.tab &&
      sender.tab.id != null
    ) {
      chrome.tabs
        .sendMessage(sender.tab.id, { type: "ytccc-check-mode" })
        .catch(() => {});
    }
    return undefined;
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
