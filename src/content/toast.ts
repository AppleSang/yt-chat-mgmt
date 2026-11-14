import type { ToastOptions } from "../language/types";
import { ROLE_COLORS } from "./dom";

const injectToastStyles = (): void => {
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
  /* Guard against wall-of-text spam: normal messages are unaffected,
     only pathologically long ones start scrolling instead of growing. */
  max-height: 40vh;
  overflow-y: auto;
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

export const initToasts = (): void => {
  injectToastStyles();
};

export const showToast = (opts: ToastOptions): void => {
  const { title, body, avatar, role, duration } = opts;
  try {
    let container = document.getElementById("ytccc-toasts");
    if (!container) {
      container = document.createElement("div");
      container.id = "ytccc-toasts";
      document.body.appendChild(container);
    }
    while (container.children.length >= 4) {
      container.firstChild!.remove();
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
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(body || ""))) {
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
    }, Math.max(1000, Number(duration) || 2800));
  } catch (e) {
    /* ignore */
  }
};
