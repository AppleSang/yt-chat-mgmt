# AGENTS — Chỉ dẫn cho AI làm việc trên repo này

Ngôn ngữ làm việc với user: **tiếng Việt**.

## Nguyên tắc bất di bất dịch
1. **KHÔNG tự ý thay đổi thiết kế hoặc logic** đã chốt trong `REQUIREMENTS.md`, `FEATURES.md`, `DESIGN_SYSTEM.md`, `UI_UX_GUIDELINES.md`. Nếu đề xuất thay đổi: hỏi user trước, chỉ làm khi được đồng ý.
2. **Bắt buộc trước khi trả lời "xong"**:
   - `node build.mjs` sạch (tự bump version + typecheck + bundle);
   - harness `node "C:\Users\Dell\AppData\Local\Temp\opencode\ytccc-test\test.js"` pass (24/24 hiện tại);
   - ghi thay đổi vào `CHANGELOG.md`.
3. Nhắc user **reload extension từ `dist\` và F5 trang** (SPA giữ content script cũ — gây nhiễu debug nếu không refresh).
4. Sau mỗi bộ chỉnh sửa, cập nhật **bộ nhớ phiên làm việc** (summary) nếu được dùng môi trường có memory.

## Cấm
- Cấm mutate DOM bên trong MutationObserver callback mà không có canonical check/guard chống lặp — từng gây treo + RAM tăng (xem CHANGELOG 1.0.63/64, quy tắc §4 ARCHITECTURE.md).
- Cấm thêm thư viện ngoài, thêm header UI, đổi màu/size token (DESIGN_SYSTEM.md) khi chưa được yêu cầu.
- Cấm đổi selector YouTube (`MESSAGE_SELECTOR`, `EMOTE_TEXT_SELECTOR`, `POLL_SELECTOR`) trừ khi user báo hỏng thật sự.
- Cấm xoá/tự ý viết lại `_legacy/` và test harness.
- Cấm commit (repo không có git) hoặc chạy lệnh phá dọn `dist/` (Chrome khoá file — build.mjs đã best-effort).

## Phải
- Mọi text UI mới đi qua i18n (thêm key cho cả `vi.ts` lẫn `en.ts`, prefix `popup*` cho popup).
- Comment code giải thích "tại sao" (tiếng Anh), không comment "cái gì".
- Giữ phiên bản chrome.storage tương thích: đọc có default, clamp số liệu (`botToastSeconds` 0–35 bằng `Number.isFinite`).
- Khi sửa bug: tìm **gốc rễ** (kiểm chứng bằng thực nghiệm khi có thể — VD test headless Chrome) thay vì vá triệu chứng; mô tả ngắn gọn nguyên nhân trong CHANGELOG.
- Trả lời ngắn gọn, đúng trọng tâm; reminder reload từ `dist\` cuối mỗi phiên bản mới.
