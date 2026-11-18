# REQUIREMENTS — yt-chat-mgmt

Extension Chrome MV3 quản lý livestream chat YouTube trên `www.youtube.com` (live_chat) và `studio.youtube.com`. Phiên bản hiện tại: xem `public/manifest.json` (đồng bộ CHANGELOG.md).

## R1. Dọn lệnh (cleanup) — 2 công tắc: "Ẩn lệnh" (`enabled`) + "Dọn lệnh" (`commandDelete`)
- R1.1. Tin nhắn chat bắt đầu bằng prefix lệnh (mặc định `!`, lưu config nhưng **không có UI** — luôn `!`) là tin lệnh (VD `!song`, `!points`).
- R1.2. Hai tay nằm **cùng một dòng popup**: Ẩn lệnh (Command hider — công tắc gốc) bên trái, Dọn lệnh (Command cleanup — tay xoá) bên phải. Dọn lệnh **chỉ hiện khi Ẩn lệnh bật** (`#commandDeletePair` ẩn qua `.opt-pair[hidden] { display: none }` — author `display:flex` đè luật UA `[hidden]` nên cần guard CSS riêng) và **bị ép TẮT trong storage** khi Ẩn lệnh tắt (popup ghi `commandDelete: false` khi load lẫn khi tắt; bật lại Ẩn lệnh → tay xoá xuất phát từ TẮT).
- R1.3. `commandDelete = true`: tin lệnh bị **xoá tự động, KHÔNG dùng menu 3 chấm** — theo thứ tự: (1) bấm thật nút thùng rác native khi server gửi bộ nút mod (`data.inlineActionButtons`) — YouTube mở hộp xác nhận xoá → extension **tự bấm nút xác nhận** ngay khi dialog render (poll 60ms, tối đa 1.2s; hộp thoại còn kẹt sau 500ms → gửi ESC đóng), (2) gọi API `live_chat/moderate` im lặng bằng params đã scrape (SAPISIDHASH từ cookie, hỗ trợ cả studio origin). Thiếu cả hai → ẩn local im lặng (không toast lỗi).
- R1.4. Nếu xoá thất bại (không đủ quyền, hết params...): **ẩn local im lặng** (KHÔNG toast lỗi), người dùng không thấy tin.
- R1.5. Tin của chính mình / chủ stream / mod cũng bị xử lý (không ngoại trừ ai).
- R1.6. `commandDelete = false` (Ẩn lệnh vẫn bật): tin lệnh chỉ bị **ẩn local** — không gọi API, không thử xoá, không toast, không ghi log; dòng vẫn tag `data-ytccc-command` để Alt+click xoá thủ công; `!poll` vẫn tạo bình chọn nếu modPoll bật (tạo poll ≠ xoá tin).
- R1.7. Khi `enabled = false`: các module khác (emote, badge, bot...) **vẫn hoạt động**; các tin đã ẩn được khôi phục (`revealHiddenMessages`); tay xoá bị ép tắt theo R1.2.
- R1.8. Mỗi lần dọn thành công → toast "Đã dọn: <nội dung>" và ghi vào log popup.

## R2. Ẩn tin bot + toast
- R2.1. Danh sách bot cấu hình được (mặc định `@nightbot, @streamelements, @streamlabs`), phân tách bằng dấu phẩy/chấm phẩy/xuống dòng, bỏ `@`, so sánh lowercase.
- R2.2. Tin của bot bị ẩn khỏi khung chat.
- R2.3. Toast thông báo bot chat: slider **0–35 giây**; `0` = tắt hoàn toàn (hiển thị "Tắt"/"Off"), không tick khi 0.
- R2.4. Toast gồm avatar, tên, role-tag, nội dung tin.

## R3. Ẩn trang trí
- R3.1. `hideBadges`: ẩn huy hiệu (#author-badges, author-badge-renderer, #chip-badges).
- R3.2. `hideAvatars`: ẩn avatar (#author-photo).

## R4. Emote
- R4.1. Emote custom từ `emotes.json` (mảng `[keyword, đường dẫn file]`, file trong `public/images/`, dùng `.avif`).
- R4.2. Emote 7TV: bộ **global set** mặc định + bộ của **user do người dùng thêm qua popup** (tìm kiếm theo tên qua GQL 7TV). Custom luôn thắng khi trùng tên.
- R4.3. Render emote trong: tin nhắn live chat, comment/community post (`#content-text`), **thẻ poll đang hoạt động trong chat** (câu hỏi + các lựa chọn). Card tổng kết poll (`yt-live-chat-viewer-engagement-message-renderer`, poll đã kết thúc): **chỉ dòng tiêu đề câu hỏi** (span `style-target="bold"`) được render emote — các dòng câu trả lời ("label (n%)") và dòng footer giữ text thuần.
- R4.4. Emote render bằng URL CDN trực tiếp (KHÔNG chuyển dataURL — tiết kiệm RAM).
- R4.5. Render emote trong poll phải **idempotent**: text gốc của label được giữ nguyên (bọc trong span ẩn, Polymer tự cập nhật), không convert lặp, tự bỏ node text trùng YouTube append thêm; card đã kết thúc hoặc đã canonical thì **không đụng DOM**. Quét lại toàn bộ khi emote load xong (`ytccc-emotes-loaded`).

## R5. Soạn tin nhắn có emote (ô chat)
- R5.1. Gõ `|` + từ khoá → gợi ý picker (lên/xuống/Enter/Escape), Tab complete; chèn emote + dấu cách.
- R5.2. Gõ ĐỦ tên emote (không cần `|`) → tự chuyển thành ảnh, KHÔNG tự thêm dấu cách.
- R5.3. Khi hiện ảnh: text gốc ẩn (1px, trong suốt) để người dùng không nhìn thấy.
- R5.4. Gõ thêm chữ cái dính vào emote ("war" → "warm") → ảnh tự trả về text, con trỏ nằm **sau** chữ vừa gõ.
- R5.5. Backspace 1 lần ngay sau emote → xoá cả emote, trả lại text.
- R5.6. Chọn emote từ catalog/emoji picker cũng chèn ảnh đúng vị trí con trỏ.
- R5.7. Copy nội dung đã chọn trong ô soạn có emote phải đưa vào clipboard **một** keyword text cho mỗi emote (không lặp `img.alt` với span ẩn); khoảng trắng chèn sau emote được copy thành dấu cách thường.

## R6. Gửi tin nhắn
- R6.1. Lúc gửi (Enter, beforeinput xuống dòng, click nút gửi, hoặc nút submit bất kỳ như tạo poll), toàn bộ emote trong ô soạn phải **flush về text gốc** (kèm phát lại sự kiện `input` để model của YouTube cập nhật) → request gửi đi là text thuần như khi không có extension.
- R6.2. Người có extension xem tin nhắn sẽ thấy emote (nhờ R4.3).

## R7. Tự chuyển chế độ chat (auto live chat)
- R7.1. Khi mở trang stream, tự bật chế độ "Live chat" nếu đang ở chế độ khác (curtain che + chuyển).
- R7.2. Chỉ phụ thuộc toggle `autoLiveChat`, KHÔNG phụ thuộc `enabled`.

## R8. Popup
- R8.1. Không header; footer = chọn ngôn ngữ (vi/en).
- R8.2. Card Cài đặt: dòng kép **Ẩn lệnh + Dọn lệnh** (Dọn lệnh chỉ hiện khi Ẩn lệnh bật, tắt theo khi Ẩn lệnh tắt — R1.2), Tự chuyển Live chat, Ẩn huy hiệu, Ẩn avatar, Danh sách bot, Toast bot (slider 0–35s).
- R8.3. Card 7TV: tìm kiếm user (placeholder `ohapplesang`), nút + để thêm, danh sách đã thêm với nút −.
- R8.4. Card Nhật ký: các tin đã dọn (avatar, tên, role-tag, nội dung, giờ), nút Xoá, số đếm, trạng thái trống.
- R8.5. Đổi setting bất kỳ → lưu `chrome.storage.sync` ngay, content script tự quét lại trong 300ms.

## R9. Ngôn ngữ
- Tiếng Việt mặc định + English; mọi text UI qua i18n.

## R10. Mod tạo cuộc bầu chọn (`!poll`)
- R10.1. Toggle popup "Mod có thể tạo cuộc bầu chọn" (`modPoll`, mặc định **tắt**).
- R10.2. Khi bật: mod/chủ kênh gõ `!poll câu hỏi // lựa chọn 1 // lựa chọn 2 // ...` (các trường ngăn cách bằng `//`, **tối thiểu 3 trường** = 1 câu hỏi + 2 lựa chọn) → extension **của chủ kênh** phân tích và tạo poll qua youtubei `live_chat/create_poll` (SAPISIDHASH, credentials owner).
- R10.3. `params` được **tự suy ra từ `continuation` của Studio chat** (payload protobuf cùng ngữ cảnh kênh/live video với create_poll), nên `!poll` hoạt động ngay lần đầu. Khi cấu trúc continuation không khả dụng, extension mới fallback sang request create_poll chủ kênh tạo thủ công (hook fetch/XHR trong `inject.ts`, gồm cả body dạng Request object), quét sâu `ytInitialData`, và cache/seed lại `chrome.storage.local`; nếu mọi nguồn đều thiếu → toast nêu rõ lý do, không gọi API.
- R10.4. Sai vai trò (không phải mod/owner) hoặc thiếu trường → toast lỗi tương ứng; tin `!poll` vẫn được dọn như lệnh thường (R1).
- R10.5. Nếu `modPoll` tắt, `!poll` được coi như lệnh thường (chỉ dọn, không tạo poll).

## R11. Highlight tên chính mình trong chat
- R11.1. Extension **tự dò handle** của viewer, ưu tiên nguồn: (1) menu guide trang chính (mục "Kênh của bạn" — `#section-items > ytd-guide-entry-renderer:first-child a[href^="/@"]`, fallback `#guide-links-primary`; chỉ tồn tại ở home/drawer mở — trang watch không có guide); (2) **nguồn thụ động** trên mọi trang chính: khi viewer tự mở menu tài khoản, nhặt link "Xem kênh của bạn"/"Your channel" trong `ytd-popup-container` (chỉ tin link có text khớp marker — không đọc menu kênh người khác, không click hộ). Iframe chat (không có guide) nhận handle qua `chrome.storage.local.ownHandle` ghi bởi trang chính + listener onChanged.
- R11.2. Mọi text trong `#message` chứa handle (kèm hoặc không kèm `@`) được bọc `span.ytccc-self-mention` — biên từ an toàn: không wrap khi dính chữ/`@` hai bên (VD `x@handle`), giữ nguyên chip mention native của YouTube (dạng cũ `#mention` lẫn dạng mới `span.mention` không id, kể cả khi node có delimiter U+200B mà YouTube chèn sau chip).
- R11.3. Chip tự dựng **mimic chip mention của YouTube**: copy `background`/`color` từ một chip thật khi gặp (`#mention` hoặc `span.mention`, VD nền đỏ `rgb(136,39,18)`), fallback nền sáng mờ + chữ trắng.
- R11.4. Idempotent: sweep 3s + sweep khi handle mới về (`sweepMentions`) không wrap lặp; không mutate khi pattern không match (chống vòng lặp mutation).

## R12. Popup chào khi đã cập nhật
- R12.1. Khi version popup **== release mới nhất trên GitHub**, badge cập nhật hiện "**Xin chào @user**" (`popupHelloUser` — en: "Hello @user") thay vì trống; dùng handle từ `ownHandle`, không phải link.
- R12.2. Trạng thái khác giữ nguyên: có bản mới → badge vàng "New Update!!! x.y.z" (link releases); dev-build → badge tím "dev-build"; không dò được handle ở trạng thái hello → ẩn badge.

## R13. Kỹ thuật bắt buộc
- Build qua `node build.mjs` (typecheck tsc + esbuild + copy static). Mọi thay đổi phải build sạch.
- Test harness jsdom (`ytccc-test/test.js`) phải pass 16/16.
- Bump version mỗi bộ thay đổi (bump-version.ps1) + ghi CHANGELOG.md.
- Không gây vòng lặp mutation observer (đã từng gây treo + RAM tăng — xem CHANGELOG 1.0.63/64).
