# UI_UX_GUIDELINES — yt-chat-mgmt

Áp dụng cho popup (`public/popup/`) và các UI inject vào trang (curtain, toast, picker). Bám theo `DESIGN_SYSTEM.md`.

## 1. Layout tổng thể (popup)
```
+-----------------------------+
| #main (scroll dọc)          |  <- vùng cài đặt, 1 cột
|   card "Cài đặt"            |
|     - Ẩn lệnh + Dọn lệnh    |  <- dòng kép: hider trái, cleanup phải;
|                             |     cleanup chỉ hiện khi Ẩn lệnh bật,
|                             |     tắt Ẩn lệnh -> ẩn + ép tắt cleanup
|     - Tự chuyển Live chat   |
|     - Ẩn huy hiệu           |
|     - Ẩn avatar             |
|     - Danh sách bot         |
|     - Toast bot (slider)    |
|   card "7TV"                |
|     - ô tìm kiếm user       |
|     - kết quả (+)           |
|     - đã thêm (−)           |
|   card "Nhật ký"            |
|     - head + nút Xoá        |
|     - #logList              |
| footer.lang-footer (46px)   |  <- label "Ngôn ngữ" + select
+-----------------------------+
```
- Popup KHÔNG có header bar (đã bỏ brand/revision).
- `#frame`: grid `1fr auto` — `#main` cuộn, footer cố định đáy.
- Thứ tự card: Cài đặt → 7TV → Nhật ký. Không đổi trật tự khi không có yêu cầu.

## 2. Vị trí nút & tương tác
- **Nút phụ (Xoá log)**: trong card-head bên phải, kiểu `.btn.btn-secondary` (border hairline, radius 8px).
- **Nút + (thêm user 7TV)**: bên phải mỗi kết quả tìm kiếm, 26×26 tròn; sau khi thêm → xoá kết quả + ô tìm kiếm.
- **Nút − (gỡ user 7TV)**: bên phải mỗi user đã thêm, 26×26 tròn; hover `#ff5c5c`.
- **Slider toast bot**: nằm dưới label `popupBotToast`, kèm giá trị hiện tại (`botToastVal`); 0 hiển thị chữ "Tắt"/"Off" (`popupOff`).
- **Badge cập nhật (`.update-badge` trong footer)**: 3 trạng thái — (1) có bản mới: vàng + pulse "New Update!!! x.y.z", link tới trang releases; (2) dev-build: tím "dev-build", không link; (3) đã cập nhật: chữ thường "Xin chào @user" (`popupHelloUser`, class `update-hello`, không link, không pulse — handle từ `chrome.storage.local.ownHandle`, ẩn khi không dò được).
- **Nút Cập nhật (`#updateAction`)**: chỉ hiện cạnh badge ở trạng thái (1), kiểu `.btn.btn-secondary`; bấm → mở tab `update/update.html`. Trang update dùng đúng token palette popup (nền `--surface-1`, card `--surface-2`, nút primary `#5e6ad2`), một dòng trạng thái + một nút hành động duy nhất; khi có bản mới hiện thêm link phụ **"Tải bản mới (.zip)"** (`.zip-link`, gạch chân, màu `--ink-subtle`) + hint nhỏ 12px (`.zip-hint`) hướng dẫn xóa-bản-cũ-kéo-zip cho người cài bằng kéo-zip; mọi text qua i18n (`update*`).
- Nút bấm luôn có trạng thái hover rõ ràng (đổi nền/border 120ms) và `cursor: pointer`.

## 3. Sidebar / Modal
- Không dùng sidebar trong popup.
- **Curtain (tự chuyển Live chat)**: overlay full chat (`curtain.ts`), icon = icon128 của extension **không bo góc** (vuông, `object-fit: contain`), không có text trang trí. Điều kiện chạy chỉ phụ thuộc `autoLiveChat`.
- **Toast**: góc trên vùng chat, avatar tròn + tên + role-tag + text; thời gian sống do `botToastSeconds` (0–35s, 0 = không hiện).
- Không tạo modal mới nếu không được yêu cầu.

## 4. Animation
- Chuẩn: 120–140ms ease cho màu/knob (xem DESIGN_SYSTEM.md §6).
- Toast: xuất hiện bằng fade ngắn, tự biến mất; KHÔNG bounce/elastic.
- Curtain: trạng thái "switching" có vòng quay/icôn chờ, kết thúc fade-out.
- Không thêm animation cho card/row (chỉ transition màu hover).

## 5. Ngôn ngữ hiển thị
- Toàn bộ label popup qua i18n (`src/language/locales/{vi,en}.ts`), key mới phải thêm cho CẢ 2 ngôn ngữ.
- Khi thêm UI mới: dùng key `popup*` mới, không hardcode tiếng Việt/Anh.

## 6. Cấm
- Không đổi kích thước popup, không thêm header/quảng cáo.
- Không đổi màu primary (`#5e6ad2`) hoặc nền canvas.
- Không dùng alert/confirm của trình duyệt.
