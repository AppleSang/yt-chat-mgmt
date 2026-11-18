# DATABASE — Cấu trúc dữ liệu (yt-chat-mgmt)

Extension không có server — toàn bộ dữ liệu nằm trong `chrome.storage` + file static.

## 1. `chrome.storage.sync` — cài đặt người dùng
| Key | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `enabled` | boolean | `true` | Master "Ẩn lệnh" (Command hider); tắt → reveal tin đã ẩn + ép tắt tay xoá |
| `commandDelete` | boolean | `true` | Tay xoá "Dọn lệnh" (bên phải Ẩn lệnh cùng dòng); popup ghi `false` khi Ẩn lệnh tắt |
| `prefix` | string | `"!"` | Prefix lệnh (không còn UI, giữ tối đa 5 ký tự) |
| `autoLiveChat` | boolean | `true` | Tự chuyển chế độ Live chat (curtain) |
| `hideBadges` | boolean | `false` | ẩn huy hiệu |
| `hideAvatars` | boolean | `false` | ẩn avatar |
| `modPoll` | boolean | `false` | Bật tính năng "Mod có thể tạo cuộc bầu chọn" (`!poll`) |
| `botList` | string | `"@nightbot, @streamelements, @streamlabs"` | Danh sách bot, phân tách `, ; \n` |
| `botToastSeconds` | number | `10` | 0–35 (clamp); 0 = tắt toast bot |
| `language` | `"vi" \| "en"` | `"vi"` | Ngôn ngữ UI |
| `emoteSetIds` | string | `""` | CSV các emote-set id 7TV (global + user đã thêm); content script nạp lại khi key đổi |
| `emoteUsers` | AddedUser[] | `[]` | User 7TV đã thêm: `{ id, name, avatar, setIds[] }` (quản lý trong popup.ts) |

Ghi chú: `botToastSeconds` clamp bằng `Number.isFinite` (an toàn với 0), không dùng `||`.

## 2. `chrome.storage.local`
| Key | Kiểu | Ý nghĩa |
|---|---|---|
| `deletedLog` | DeletedLogEntry[] (tối đa 200) | Lịch sử tin đã dọn: `{ author, text, at (epoch ms), role, avatar? }` |
| `switchStatus` | `{ state, at }` | Trạng thái curtain auto-live-chat: `state ∈ "switching" \| "done" \| "failed" \| "off" \| "unknown"` |
| `pollParams` / `pollContext` | string | `params` + `context.client` (JSON) của create_poll bắt được từ lần chủ kênh tạo bình chọn thủ công — seed lại vào dataset khi boot để `!poll` không cần warm-up lại mỗi phiên |
| `ownHandle` | string | Handle của viewer dò được từ menu guide ("Kênh của bạn" → `/@handle`, không kèm `@`) — trang chính ghi, iframe chat + popup "Xin chào @user" đọc (R11/R12) |

## 2b. IndexedDB `ytccc-updater` (trang update, F14)
| Store / key | Kiểu | Ý nghĩa |
|---|---|---|
| `handles` / `extDir` | `FileSystemDirectoryHandle` | Thư mục cài đặt extension do user chọn qua `showDirectoryPicker` (1 lần) — các lần update sau đọc lại handle, xin quyền trong click nếu Chrome thu hồi |

## 3. `public/emotes.json` — emote custom
```json
[
  ["sangroll", "images/sangroll.avif"],
  ["BANTUMLUM", "images/BANTUMLUM.avif"]
]
```
- Mảng cặp `[keyword, đường dẫn相对 với extension root]`.
- Custom luôn thắng emote 7TV khi trùng keyword.

## 4. Emote runtime (module `emotes.ts`)
- `emotes: Emote[]` — `{ keyword, file }` gộp custom + 7TV.
- `emoteUrls: Record<file, url>` — file local → `chrome.runtime.getURL`; 7TV → URL CDN trực tiếp (ưu tiên `2x.webp`; KHÔNG dataURL).
- `emotePattern` — regex biên từ (?<![\p{L}\p{N}_])keyword(?![\p{L}\p{N}_]) với danh sách keyword escaped; rebuild khi nạp emote.
- `emoteKeywordSet` / `emoteKeywordMap` — fast-check + tra cứu lowercase.

## 5. Dữ liệu DOM do extension tạo (đánh dấu trong trang)
| Marker | Vị trí | Ý nghĩa |
|---|---|---|
| `img[data-ytccc-keyword]` | ô soạn chat | img emote đã chèn (kèm keyword trong dataset) |
| `span` ẩn 1px + `\u200b` | sau img trong ô soạn | giữ text gốc để YouTube đọc |
| `img[data-ytccc-poll]` | thẻ poll | emote poll do mình vẽ |
| `span[data-ytccc-poll-src]` (display:none) | cạnh img poll | giữ text gốc của keyword poll |
| `#ytccc-emote-picker` | body | picker gợi ý `|` |
| `.ytccc-catalog-section` | emoji picker YouTube | catalog emote custom |
| `data-ytccc-emote-field="1"` | field từng chứa emote | đánh dấu field cần flush khi submit |
| `data-ytccc-poll-params` / `data-ytccc-poll-context` | `documentElement` (do inject.ts ghi) | `params` + `context.client` của create_poll, bắt từ lần chủ kênh tạo poll thủ công (hook fetch/XHR) hoặc quét `ytInitialData` — dùng cho lệnh `!poll` |
| `span.ytccc-self-mention` | trong `#message` | chip highlight tên chính mình (F12), mimic chip `#mention` của YouTube |
| `#ytccc-mention-style` | head | CSS chip mention qua biến `--ytccc-mention-bg/fg` trên `documentElement` |
| phần tử ẩn tin (`hideLocally`) | tin nhắn | registry `hiddenMessages` trong commands.ts để reveal lại |

## 6. API ngoài (không chính thức)
- 7TV REST: `GET https://7tv.io/v3/emote-sets/{id}`, `GET https://7tv.io/v3/users/{7tvId}`; GQL: `POST https://7tv.io/v3/gql` (query `users(query,$limit)` — UserPartial).
- YouTube youtubei: `POST /youtubei/v1/live_chat/moderate`, `POST /youtubei/v1/live_chat/create_poll` — moderate do extension chủ động gọi; create_poll do trang tự gọi (inject.ts bắt lại params) và do extension gọi khi mod dùng `!poll` (với credential chủ kênh).
- Có thể thay đổi bất cứ lúc nào → mọi parse phải phòng thủ (optional chaining + try/catch).
