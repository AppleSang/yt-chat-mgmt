# yt-chat-mgmt

Tiện ích Chrome giúp live chat YouTube sạch sẽ và có thêm emoji 7TV.

English: [README.md](README.md)

## Tính năng

**Dọn chat**
- Tự dọn tin nhắn bắt đầu bằng dấu lệnh `!` : Xoá khi bạn là kiểm duyệt viên của kênh chat, không thì ẩn âm thầm.
- Tự bật chế độ "Trò chuyện trực tiếp".
- Ẩn badge hội viên / mod và avatar người chat.
- Ẩn bot (`@nightbot`, `@streamelements`, …) — tin nhắn của bot hiện thành toast.
- Nhật ký kênh chat khi sử dụng lệnh - trong những trường hợp cần nắm thông tin mà extension đã dọn.

**Emoji 7TV**
- Sử dụng được emoji của 7TV trực tiếp ngay trong kênh chat
- Danh sách emoji của 7TV được tích hợp vào trong danh sách emoji có sẵn ở youtube, thanh tìm kiếm cũng hoạt động với emoji của 7TV
- Gọi emoji là gõ keyword vào ô chat; gõ `|emoji7tv` — hoặc gõ đủ keyword — là tự thành emoji.
- Render emoji của 7TV với chất lượng cao

## 📥 Cài đặt 📥

1. Tải extension tại [đây](https://github.com/AppleSang/yt-chat-mgmt/releases) | Tải file đuôi .zip (không phải source code đâu).
3. Mở `chrome://extensions`.
4. Bật **Chế độ dành cho nhà phát triển** (góc trên phải).
5. Kéo thả cả file zip extension vào trong trình duyệt. Xong!

## 🔄 Cập nhật 🔄

Popup hiện badge **có bản mới** khi có bản phát hành mới; nút **Cập nhật** mở trang cập nhật.

- **Cài bằng kéo zip** (theo hướng dẫn trên): bấm **Tải bản mới (.zip)** trên trang cập nhật, mở `chrome://extensions`, **xóa bản cũ**, rồi kéo file zip vừa tải vào trang. Bắt buộc xóa trước — kéo zip mới chồng lên bản đang cài sẽ thành 2 bản chạy song song.
- **Cài bằng thư mục unpacked**: bấm **Cập nhật ngay**, chọn thư mục extension 1 lần — trang cập nhật tự ghi file mới và khởi động lại extension.

Sau khi cập nhật, mở lại (F5) các tab YouTube.

## Credit

- [7TV](https://7tv.app) — dữ liệu emoji từ API công khai 7tv.io, ảnh CDN và logo 7TV.
- [7tv-for-youtube của syocless](https://github.com/syocless/7tv-for-youtube) — cách tiếp cận mà phần tích hợp 7TV của dự án này dựa theo.
- Build bằng TypeScript + esbuild. Không có thư viện chạy kèm (zero dependency).

<p align="center">
  <img src="yt-chat-mgmt-banner.svg" alt="yt-chat-mgmt" />
</p>
