# yt-chat-mgmt

Tiện ích Chrome giúp live chat YouTube sạch sẽ và có thêm emoji 7TV.

English: [README.md](README.md)

## Tính năng

**Dọn chat**
- Tự dọn tin nhắn bắt đầu bằng dấu lệnh (mặc định `!`): xoá khi có quyền, không thì ẩn âm thầm — kèm toast "Cleaned: …".
- Tự bật chế độ "Trò chuyện trực tiếp" (Live chat).
- Ẩn badge hội viên / mod và avatar người chat.
- Ẩn bot (`@nightbot`, `@streamelements`, …) — tin nhắn của bot hiện thành toast có link bấm được.
- Nhật ký hoạt động, xoá một nút bấm.

**Emoji 7TV**
- Render emoji 7TV trong live chat và poll: set global + các set của user bạn thêm.
- Nút 7TV (và avatar user đã thêm) nằm ngay trong bảng emoji của YouTube. Ô tìm kiếm của picker cũng lọc emoji 7TV của bạn.
- Bấm emoji là gõ keyword vào ô chat; gõ `|keyword` — hoặc gõ đủ keyword — là tự thành emoji.
- Render 4x (chất lượng cao) với cache an toàn: ghi 30 emote mỗi 3 giây, có thanh tiến độ + thời gian còn dự kiến, và giữ 2x cho đến khi cache 4x xong.

**Bảng cài đặt (popup)**
- Mọi tuỳ chọn gọn trong một popup, tiếng Việt hoặc tiếng Anh.
- Card Thống kê: dung lượng cache và tiến độ cache.

## Cài đặt (Developer mode)

1. Tải hoặc clone repo này.
2. Mở `chrome://extensions`.
3. Bật **Chế độ dành cho nhà phát triển** (góc trên phải).
4. Bấm **Tải tiện ích chưa đóng gói** rồi chọn thư mục `dist/`.
5. Mở một livestream YouTube bất kỳ — xong.

Build từ mã nguồn: `node build.mjs` (cần Node.js).

## Credit

- [7TV](https://7tv.app) — dữ liệu emoji từ API công khai 7tv.io, ảnh CDN và logo 7TV.
- [7tv-for-youtube của syocless](https://github.com/syocless/7tv-for-youtube) — cách tiếp cận mà phần tích hợp 7TV của dự án này dựa theo.
- Build bằng TypeScript + esbuild. Không có thư viện chạy kèm (zero dependency).

<p align="center">
  <img src="yt-chat-mgmt-banner.svg" width="640" alt="yt-chat-mgmt" />
</p>
