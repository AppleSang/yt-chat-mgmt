# ARCHITECTURE — yt-mng-extension

## 1. Tổng quan
- Chrome Extension **Manifest V3**, TypeScript (esbuild bundle, không framework).
- Thành phần: background service worker + content script (chat) + popup (action popup).
- Build: `node build.mjs` — chạy `tsc --noEmit` (spawnSync với `process.execPath`), **tự bump patch version trong `manifest.json` trước khi bundle** (watch rebuild không bump), esbuild bundle 5 entry → `dist/`, copy static từ `public/`. `cleanDist` best-effort (Chrome khoá `dist\content` khi extension đang load → ghi đè tại chỗ).
- Bump version thủ công: `bump-version.ps1` (dự phòng, build.mjs đã tự bump). Chrome load thư mục `dist/`.
- Không có git repo; `_legacy/` là backup JS trước khi chuyển TypeScript.

## 2. Cấu trúc thư mục
```
src/
  language/
    types.ts        # ExtensionConfig, Emote, ToastOptions, DeletedLogEntry, BgRequest...
    i18n.ts         # setLanguage, t() - chọn bảng locale
    locales/vi.ts   # bảng tiếng Việt
    locales/en.ts   # bảng tiếng Anh
  background/
    index.ts        # service worker: proxy fetch resource (nếu cần), check request
  content/
    index.ts        # boot + observers + sweeps (điểm vào content script)
    config.ts       # DEFAULTS, loadConfig, watchConfig, isBot
    commands.ts     # detect/hide/xoá lệnh qua moderate API, deletedLog, revealHiddenMessages, Alt+click (synth trash), confirm dialog tự bấm
    mention.ts      # highlight tên chính mình: dò handle từ guide/account menu, wrap chip .ytccc-self-mention (F12)
    dom.ts          # MESSAGE_SELECTOR, applyBadges (badge+avatar), ROLE_COLORS
    toast.ts        # toast trong vùng chat
    curtain.ts      # auto live chat switch (overlay + icon128)
    emotes.ts       # nguồn emote (custom + 7TV), applyEmotes, applyPollEmotes, EMOTE_TEXT_SELECTOR, POLL_SELECTOR
    suggest.ts      # ô soạn: picker, insertEmote, tryAutoComplete, revert/restore, flush gửi tin
    logger.ts       # [YTCCC] console log
    inject.ts       # đọc client info trang
  popup/
    popup.ts        # render + lưu settings + 7TV GQL search
  update/
    update.ts       # trang tự cập nhật: fetch release → zip.ts → ghi thư mục → reload (F14)
    zip.ts          # zip parser (EOCD + central dir, DecompressionStream, zip-slip guard)
public/
  manifest.json     # MV3; matches/host_permissions: youtube + 7tv.io + github.com + objects.githubusercontent.com; key cố định → ID ổn định qua các lần cài lại
  emotes.json       # emote custom: [["sangroll","images/sangroll.avif"], ...]
  icons/ images/ popup/{popup.html,popup.css} update/{update.html}
build.mjs  bump-version.ps1  dist/
```

## 3. Luồng dữ liệu chính
- **Settings**: popup → `chrome.storage.sync` → content `watchConfig` (onChanged) → cập nhật `config` + quét lại (debounce 300ms).
- **Tin nhắn chat**: MutationObserver(trên body, childList+subtree) → `handleAddedNode` (badge + command + emote cho tin nhắn) / schedulePollEmotes (poll, debounce 150ms, bỏ qua batch chứa artifact của mình) / closest(MESSAGE_SELECTOR) → applyEmotes.
- **Sweep an toàn**: 3s một lần (`emoteSweep`: tin nhắn + `#content-text` + poll + catalog) và 300ms sau khi đổi settings. Sweep = lưới an toàn chống trượt node.
- **Moderate API**: content script gọi thẳng `https://www.youtube.com/youtubei/v1/live_chat/moderate?prettyPrint=false` với SAPISIDHASH (SAPISID/1P/3P × origin `location.origin`), hoạt động cả trên studio.
- **Create poll params**: main-world injector giải mã payload protobuf lồng trong Studio `continuation` để dựng `create_poll.params` ngay lần đầu; chỉ fallback sang params bắt từ poll thủ công/cache hoặc `ytInitialData` khi continuation không hợp lệ.
- **7TV**: popup GQL `POST https://7tv.io/v3/gql` (search user) + `GET /v3/users/{id}` (lấy set id); content `GET /v3/emote-sets/{id}` (nạp emote). Ảnh = URL CDN trực tiếp.

## 4. Quy tắc chống đòn bẩy DOM (RẤT QUANTRỌNG)
- Không bao giờ mutate DOM trong MutationObserver callback một cách vô điều kiện — từng gây vòng lặp vô hạn → treo + RAM tăng (CHANGELOG 1.0.63/64).
- Poll xử lý theo **canonical check**: chỉ mutate khi card chưa đúng trạng thái đích (có text raw mới / chuyển ended). Batch observer chứa artifact của mình (`data-ytccc-poll`, `data-ytccc-poll-src`) bị bỏ qua.
- Node text chứa `\u200b` bỏ qua khi quét emote (chống re-process).

## 5. Kiểm thử
- jsdom harness: `C:\Users\Dell\AppData\Local\Temp\opencode\ytccc-test\test.js` — 24 test, load `dist\content\content.js`. Phải pass 24/24 trước khi phát hành (cùng các suite đặc thù: alt-delete 37, mention 15, popup-update 16, popup-hider 10, command-hider 13, zip-parser 8, update-page 19...).
- Kiểm thử tay: load `dist/` vào Chrome → reload extension → **F5 trang** (SPA giữ content script cũ — nguyên nhân nhiễu khi debug).

## 6. Quy ước code
- TS strict; module ESM; không thêm thư viện ngoài (esbuild + tsc là đủ).
- Hàm nhỏ, có comment tiếng Anh giải thích "tại sao" (không comment vô nghĩa).
- Key i18n mới: thêm cả `vi.ts` và `en.ts`.
- Mọi thay đổi: build sạch (tự bump) + 24/24 + ghi CHANGELOG.md.
- **Chống vòng mutation khi thay text node**: chỉ `replaceChild` khi nội dung mới KHÁC node gốc (bài học applyMention 1.0.117 — thay fragment giống hệt → observer tự kích hoạt vô hạn).
