# DESIGN_SYSTEM — yt-chat-mgmt (yt-mng-extension)

Nguồn sự thật: `public/popup/popup.css` (CSS variables ở `:root`). **Không tự ý đổi token** — nếu phải đổi, cập nhật cả file này.

## 1. Màu sắc (HEX)

### Nền (dark canvas, phong cách Linear)
| Token | HEX | Dùng cho |
|---|---|---|
| `--canvas` | `#010102` | Nền toàn popup |
| `--surface-1` | `#0f1011` | Card, input |
| `--surface-2` | `#141516` | Hover row, hover result |
| `--surface-3` | `#18191a` | Nút phụ (stv-add/remove), switch off |
| `--surface-4` | `#191a1b` | Bề mặt nổi cao hơn |
| `--hairline` | `#23252a` | Border card, divider |
| `--hairline-strong` | `#34343a` | Border input, border nút tròn |

### Chữ
| Token | HEX | Dùng cho |
|---|---|---|
| `--ink` | `#f7f8f8` | Tiêu đề, text chính |
| `--ink-muted` | `#d0d6e0` | Label option |
| `--ink-subtle` | `#8a8f98` | Text phụ, placeholder-ish |
| `--ink-tertiary` | `#62666d` | Timestamp, hint, footer |

### Màu nhấn / trạng thái
| Token | HEX | Dùng cho |
|---|---|---|
| `--primary` | `#5e6ad2` | Switch on, accent |
| `--primary-hover` | `#828fff` | Hover accent, số đếm log, role-tag moderator |
| `--on-primary` | `#ffffff` | Chữ/knob trên primary |
| `--success` | `#27a644` | Role-tag member |
| `--danger` | `#e5484d` | (reserved) |
| `#ff5c5c` | `#ff5c5c` | Hover nút xoá (−) 7TV |

### Màu role (curtain/log, theo `dom.ts ROLE_COLORS`)
owner `#ffb300` · moderator `#4285f4` · member `#2ba640` · viewer `#ffffff`

## 2. Font
- Sans: `--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
- Mono (botList, 7TV search, timestamp, prefix): `--font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace`
- Body 14px / line-height 1.5 / letter-spacing `-0.05px`; label 13px; hint 12px; timestamp mono 11px; role-tag 10px.

## 3. Kích thước chuẩn
- Popup: `#frame` grid `1fr auto`, cao 100vh; `#main` padding `16px 18px`, gap 14px.
- Footer ngôn ngữ: cao 46px, padding ngang 18px, border-top 1px hairline.
- Card: padding `14px 16px`; card-head padding-bottom 10px + border-bottom.
- Switch: 40×22px, knob 16px, offset 2px; checked → knob left 20px.
- Avatar log: 32×32 tròn; avatar kết quả 7TV: 24×24 tròn; nút +/−: 26×26 tròn.
- Input (#botList, #sevenTvSearch): full-width, padding `7px 10px`, font mono 12px.
- Checkbox option: 14×14, `accent-color: var(--primary)`.
- Scrollbar: 6px, thumb hairline-strong, radius 3px.

## 4. Border & radius
| Token | Giá trị |
|---|---|
| `--radius-card` | `10px` |
| `--radius-btn` | `8px` |
| Nút tròn / avatar | `50%` |
| Role-tag | `4px` |
| Input | `8px` |

Border mặc định: `1px solid var(--hairline)`; input/nút tròn: `1px solid var(--hairline-strong)`; card hover → `--hairline-strong`.

## 5. Shadow & focus
- Focus ring (input có focus): `--focus-ring: 0 0 0 2px rgba(94, 106, 210, 0.4)` (dùng `box-shadow`, không dùng outline).
- Popup không dùng drop-shadow trang trí; picker emote trong chat (`#ytccc-emote-picker`) dùng `box-shadow: 0 6px 20px rgba(0,0,0,0.5)` (nền `#202124`, border `#3c4043`, radius 10px).

## 6. Animation
- Thời lượng chuẩn: **120ms ease** (màu nền/border), **140ms ease** (knob switch dịch chuyển).
- Curtain auto-live-chat và toast: xem `UI_UX_GUIDELINES.md` (fade/slide, không bounce).

## 7. Quy tắc
1. Chỉ dùng biến `--*`, không ghi HEX mới trực tiếp vào rule (trừ token trong bảng trên).
2. Không thêm gradient/blur/emoji vào UI.
3. Dark theme duy nhất — không có light mode.
