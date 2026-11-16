# FEATURES — Luồng hoạt động từng tính năng

## F1. Dọn lệnh (!command) — `commands.ts`
1. Content script boot trên trang chat (`yt-live-chat-app, #chat-items`).
2. MutationObserver bắt tin nhắn mới (`MESSAGE_SELECTOR`).
3. `processMessage(el)`:
   - Đọc tên tác giả + nội dung (`#author-name`, `#message`).
   - Nếu text bắt đầu bằng prefix `!` → là tin lệnh; gắn tag `data-ytccc-command` cho Alt+click (kể cả khi cleaner tắt).
   - **Hai tay config**: `enabled` (**Ẩn lệnh** / Command hider — công tắc gốc) và `commandDelete` (**Dọn lệnh** / Command cleanup — tay xoá, chỉ có tác dụng khi hider bật).
   - `commandDelete` false → **chỉ ẩn local** (`hideLocally`): không gọi API/menu, không toast, không ghi `deletedLog`; `!poll` vẫn được tạo nếu `modPoll` bật (tạo poll ≠ xoá tin).
   - `commandDelete` true → **xoá không đụng menu 3 chấm**: ưu tiên bấm nút thùng rác native (`data.inlineActionButtons` server gửi cho mod), không có thì gọi `deleteViaApi` (POST youtubei moderate, SAPISIDHASH) bằng params đã scrape (`waitForParams`, tối đa 2500ms) → luôn ẩn local; thành công → toast "Đã dọn: ..." + ghi `deletedLog`; thiếu cả hai đường → ẩn im lặng.
4. Toggle `enabled` tắt → `revealHiddenMessages()` khôi phục mọi tin đã ẩn (dọn lệnh tắt hẳn thì không ẩn gì mới).

## F2. Ẩn bot + toast — `commands.ts` + `toast.ts`
1. Config botList → mảng tên (bỏ @, lowercase).
2. Tin mới có tác giả khớp → ẩn local.
3. Nếu `botToastSeconds > 0` → toast (avatar, tên, role, text) trong N giây; 0 = không toast.

## F3. Ẩn badge/avatar — `dom.ts`
- `applyBadges(el)` chạy cho từng tin nhắn (observer) + sweep: set `display:none` theo `hideBadges`/`hideAvatars`.

## F4. Emote render — `emotes.ts` + `index.ts`
1. Nguồn: custom (`emotes.json`) + 7TV global + 7TV set của user (storage `emoteSetIds`, reload khi key đổi).
2. URL ảnh: file local (`chrome.runtime.getURL`) hoặc CDN 7TV (`2x.webp` ưu tiên).
3. `applyEmotes(el)`:
   - Tin nhắn: xử lý text node trong `#message`; comment: `#content-text`.
   - Regex biên từ (không khớp giữa từ dài), bỏ qua node chứa `\u200b` (chống re-process).
   - Thay keyword bằng `<img>` CDN.
4. Poll: `applyPollEmotes(card)` — binding-safe state machine: legacy img không mark bị xoá; poll kết thúc (text có `(n%)`) → unwrap text gốc + xoá img; canonical check (không mutate khi mọi keyword đã là emote, node text nằm trong span ẩn bị bỏ qua); convert chỉ nhắm node text thô: label 1 keyword → **giữ nguyên text node** (bọc span ẩn — Polymer cập nhật tại chỗ) + chèn img trước span; text trộn nhiều keyword → thay fragment (giữ keyword trong span ẩn). Node text trùng YouTube append thêm cạnh cặp [img][span] sẵn có → **bỏ (dedup)**. Card tổng kết poll (`yt-live-chat-viewer-engagement-message-renderer`): chỉ dòng tiêu đề câu hỏi (span `style-target="bold"`) được render emote, các dòng câu trả lời + footer giữ text thuần; `#message` cũng được xử lý khi nhận trực tiếp element này.
5. Chu kỳ xử lý: observer (tin nhắn tức thời; poll debounce 150ms, bỏ qua batch chứa artifact của mình) + sweep 3s (gồm `#message` engagement) + sweep khi emote load xong (`ytccc-emotes-loaded`) + sweep 300ms khi đổi settings.

## F5. Soạn tin có emote — `suggest.ts`
1. Gõ `|abc` → picker gợi ý (móc scenario: Tab/Enter chèn + dấu cách; ArrowUp/Down điều hướng; Esc đóng).
   - Tab cũng complete bare word (`:app`, `app`) khi picker đóng (fix 1.0.73, `tabComplete`).
2. Gõ đủ tên (`war` + Enter/cách gõ tự nhiên) → `tryAutoComplete`: thay node text bằng `[img][span ẩn "\u200bwar\u200b"][anchor "\u200b"]`, caret cuối field.
3. Gõ thêm chữ cái → `revertExtendedEmote`: emote trả về text, gộp text gõ thêm (xoá `\u200b`), caret sau chữ vừa gõ.
4. Backspace tại anchor → `restoreEmoteToText`: xoá cả emote, trả text, caret cuối từ.
5. Catalog (emoji picker YouTube) + picker riêng → `insertEmote(keyword)`: thay `|token` (nếu có) hoặc chèn tại caret bằng DOM range.
6. Copy trong ô soạn: clone selection, bỏ ảnh khi span nguồn ẩn đi kèm (hoặc dùng keyword ảnh cho selection chỉ có ảnh), xoá `\u200b` và đổi NBSP thành dấu cách trước khi ghi `text/plain` vào clipboard.

## F6. Gửi tin (flush) — `suggest.ts`
1. Kết thúc soạn: Enter (không modifier) / beforeinput insertLineBreak|insertParagraph / click `#send-button` / click nút submit bất kỳ.
2. `flushActiveField` / `flushTrackedFields`: mọi field từng chứa emote (Set `emoteFields`, hoạt động cả shadow DOM) được:
   - Xả `[img][span ẩn]` → text gốc thuần, xoá `\u200b`;
   - Phát lại `InputEvent("input")` (cờ `flushing` chặn handler của mình) để model YouTube cập nhật.
3. YouTube đọc field/model → request mang text thật. Người có extension vẫn thấy emote trong khung chat (F4).

## F7. Tự chuyển Live chat — `curtain.ts`
1. `ensureSwitchLoop` (gate chỉ `switchRunning || !config.autoLiveChat`) → hiện curtain (icon128 vuông) → check/bật chế độ Live chat → set `switchStatus` (storage.local) → gỡ curtain.
2. Popup/background có thể hỏi trạng thái qua `ytccc-check-mode`.

## F8. Popup — `popup.ts` + `popup.html`
1. `loadAll`: đọc config + deletedLog + emoteSetIds + emoteUsers; render theo ngôn ngữ.
2. Bất kỳ thay đổi → `chrome.storage.sync.set` ngay (không nút Lưu).
3. 7TV search: GQL `users(query,limit)` → danh sách + nút +; thêm → lưu `emoteSetIds` (csv set id) + `emoteUsers` (danh sách user); nút − gỡ theo user.
4. Xoá log → `chrome.storage.local.set({deletedLog: []})`.

## F9. i18n — `language/i18n.ts`
1. `setLanguage(code)` chọn bảng vi/en; popup render + toast + curtain dùng key.
2. Đổi ngôn ngữ ở footer → lưu sync → mọi UI đọc lại.

## F10. Mod tạo cuộc bầu chọn (`!poll`) — `commands.ts` + `inject.ts`
1. `inject.ts` (main world) tự giải mã `continuation` của Studio chat để dựng `params` create_poll đúng ngữ cảnh kênh/live video, vì vậy không cần tạo poll thủ công trước. Nếu continuation đổi hoặc không có, bắt request `create_poll` (fetch + XHR) do chủ kênh tạo thủ công → lưu `params` + `context.client` vào `documentElement.dataset` (`ytcccPollParams`, `ytcccPollContext`); dự phòng cuối: quét sâu `ytInitialData` tìm key chứa "poll" có `params`.
2. Mod/chủ kênh gõ `!poll "câu hỏi" "lựa chọn 1" "lựa chọn 2" ...` → extension của chủ kênh phân tích (ngoặc kép, tối thiểu 3 trường).
3. Bật toggle `modPoll` trong popup (mặc định tắt). Đúng vai trò (mod/owner) + đủ trường → POST `live_chat/create_poll` (SAPISIDHASH như moderate) với `questionText`/`optionText` dạng `text_segments`.
4. Thiếu `params` sau khi tự suy ra continuation và thử mọi fallback → toast hướng dẫn; sai vai trò/thiếu trường → toast lỗi.
5. Tin `!poll` tiếp tục được dọn như lệnh thường (F1).

## F11. Xoá nhanh bằng Alt+click (tay của F1) — `commands.ts`
1. **Giữ `Alt`** → `ytccc-alt-del-on` lên `documentElement`: viền đỏ + crosshair chỉ trên dòng `!` (`data-ytccc-command` — được gắn cả khi cleaner tắt), đồng thời quét một lượt pointerenter/pointerover/mousemove tổng hợp để thúc YouTube stamp bộ nút mod native.
2. **Nguồn nút xoá trên từng dòng `!`** (thứ tự ưu tiên):
   - **Nút native**: YouTube stamp bộ 🗑/⏳/⊘ từ `data.inlineActionButtons` — payload server chỉ gửi mod trên stream live. Có sẵn hoặc stamp được (tự đăng ký `stampDom["data.inlineActionButtons"]` + replay `data`) → bấm thẳng nút thùng rác native = xoá qua đúng pipeline YouTube.
   - **Nút tự dựng (synth)**: dòng không có payload → tạo `yt-icon-button.ytccc-inline-trash` (icon xoá Material, tròn 32px, tooltip i18n `altTrashTitle`) gắn vào `#inline-action-buttons`; CSS `:has(#inline-action-buttons > *)` force hiện container khi giữ Alt.
   - Chuỗi xoá dùng chung `deleteViaScraped`: **chỉ còn params đã scrape → API im lặng** (menu 3 chấm đã bị loại bỏ hoàn toàn theo yêu cầu thiết kế); ẩn local khi thành công.
3. **Alt+click dòng `!`** hoặc bấm nút (native/synth) → đúng MỘT đường xoá: native press ưu tiên (synth bị loại khỏi phép dò để không bấm vòng), không có native thì `deleteViaScraped` (params → API, không menu); thất bại → chớp viền đỏ 700ms, không đổi trạng thái.
4. **Vệ sinh**: nhả Alt / mất focus → xoá toàn bộ nút synth; bản copy trong dải ghim (`yt-live-chat-banner-manager`) được bảo vệ hoàn toàn; bấm ngoài dòng `!` hoặc không giữ Alt → hành vi native nguyên vẹn.
5. Test: `alt-delete-test.cjs` (32 case — native/synth/force-stamp/chain/flash/pinned/no-Alt).
