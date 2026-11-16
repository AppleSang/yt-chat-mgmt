# CHANGELOG — yt-chat-mgmt

English: [CHANGELOG_EN.md](CHANGELOG_EN.md)

## 1.0.107
- **Alt+click thu hẹp phạm vi = tay của command cleaner**: chỉ các tin nhắn bắt đầu bằng ký tự lệnh (`!` — theo `prefix` cấu hình) mới bị xoá khi giữ Alt + bấm; tin thường giữ nguyên hành vi native (link, menu...). Thay thế thao tác 3 chấm → Xoá thủ công cho spam `!` (hữu dụng nhất khi auto cleaner đang tắt). Dòng lệnh được gắn `data-ytccc-command` ngay cả khi cleaner tắt, nên highlight viền đỏ khi giữ Alt chỉ hiện trên đúng các dòng `!`.
- Kiểm chứng: build sạch; Alt-delete test 17/17 (thêm: CSS giới hạn dòng lệnh / tag đúng dòng / tin thường không bị xoá + không flash); harness 24/24; picker 47/47; cache 11/11; banner 12/12; dock 18/18; badge 9/9.

## 1.0.106
- **Tin nhắn ghim thoát khỏi chế độ ẩn bot**: bản copy của tin nhắn ghim (message renderer nằm trong `yt-live-chat-banner-manager`) giờ được miễn hoàn toàn khỏi luồng kiểm duyệt — chủ kênh ghim tin nhắn của bot thì tin ghim vẫn hiện bình thường trong dải ghim (bot message trong danh sách chat vẫn bị ẩn + toast như cũ). Cả lệnh xoá (`!`-prefix) và Alt+click đều bỏ qua bản copy trong dải ghim; badge/emote vẫn áp lên bản copy (chỉ hiển thị).
- **Tin nhắn ghim nổi trên cột chat**: stylesheet vị trí ở chế độ Trên thêm `position:relative;z-index:2;flex-shrink:0` cho `yt-live-chat-banner-manager` — dải ghim luôn vẽ trên cột chat và không bao giờ bị cột flex nén mất khoảng; chế độ Dưới giữ nguyên mirror thuần thứ tự native (không thêm gì).
- **Xoá nhanh bằng Alt+click (mod)**: giữ `Alt` → các dòng tin nhắn highlight viền đỏ + con trỏ crosshair khi hover; bấm chuột trái vào một dòng là xoá luôn tin nhắn đó (priority giống luồng lệnh `!`: params có sẵn → gọi thẳng API `live_chat/moderate` im lặng, không có params → mở menu ngữ cảnh bấm mục Xoá, menu mở lên có annotation thì thử lại API một lần). Xoá thành công → ẩn dòng ngay lập tức; thất bại (không phải mod / hết quyền) → viền đỏ chớp 700ms, không đổi trạng thái gì; bản copy trong dải ghim được bảo vệ, bấm ngoài dòng tin nhắn thì đi qua bình thường; nhả Alt / mất focus là thoát chế độ (không kẹt).
- Kiểm chứng: build sạch; banner test 12/12 (thêm: copy bot ghim vẫn hiện + copy trong list vẫn ẩn, z-index chỉ ở chế độ Trên); test Alt-delete mới 12/12 (API / menu fallback / flash thất bại / bảo vệ ghim / click ngoài + không giữ Alt vô hại / nhả Alt); harness 24/24; picker 47/47; cache 11/11; dock 18/18; badge 9/9.

## 1.0.105
- **Sửa vị trí tin nhắn ghim (gốc rễ)**: cách di chuyển manager trong DOM của 1.0.104 thua cuộc "giành giật" với YouTube — kiểm chứng thực nghiệm trên stream thật: ~3 giây sau khi bị di chuyển, platform tự re-parent `yt-live-chat-banner-manager` về slot native (banner cứ đứng dưới dù chọn Trên). Giờ đặt vị trí hoàn toàn bằng CSS `order` trên container flex (inner `#contents` là `display:flex;flex-direction:column`): chọn Trên = banner xếp sau separator/trước `#chat`; chọn Dưới = ghim đúng thứ tự native hiện nay, đồng thời khoá cứng để YouTube tự đổi thứ tự DOM sau này cũng không làm lệch nghĩa của lựa chọn. Không đụng DOM nữa nên sống sót qua mọi re-parent/re-render; stylesheet bị xoá thì sweep 3s tự dựng lại.
- **Sửa nhấp nháy trong sách emoji (7TV)**: YouTube định kỳ re-render picker làm các node mình inject biến mất rồi 3s sau sweep mới thêm lại — panel cao ~400px chiếm phần lớn khung picker nhấp nháy ẩn/hiện theo chu kỳ. Giờ một MutationObserver scoped vào picker phát hiện node mình bị bỏ rơi và **gắn lại tức thì trong cùng tick**: panel được tái sử dụng nguyên element (grid + ảnh đã load giữ nguyên, không reload), trạng thái mở/tìm kiếm được giữ khi cùng một phần tử picker; picker element MỚI (mở lại sau khi gửi) vẫn khởi tạo trạng thái sạch như cũ. Các đường gắn lại đều qua canonical check nên observer không thể tự lặp.
- **Tự nhảy qua 7TV khi kéo hết danh sách emoji**: cuộn danh sách emoji gốc đến hết thì panel 7TV Global tự mở (nhảy 1 lần mỗi lần chạm đáy, rời đáy rồi quay lại mới nhảy tiếp); đang mở sẵn hoặc đang ở chế độ tìm kiếm thì không tự nhảy; scroller không cuộn được / chưa layout (0/0) bị chặn để picker ẩn không tự dính panel.
- Kiểm chứng: build sạch; test banner viết lại 11/11 (stylesheet content / computed order / không đụng DOM / flip qua storage / idempotent / sống sót re-parent / tự phục hồi); picker 47/47 (thêm 12: gắn lại tức thì / cùng element / giữ trạng thái + grid / picker mới khởi đóng / auto-jump + re-arm + tick trùng vô hại); harness 24/24; cache 11/11; dock 18/18; badge 9/9.

## 1.0.104
- **Vị trí tin nhắn ghim (banner)**: hàng mới trong popup "Vị trí tin nhắn ghim" với 2 ô chọn Trên/Dưới (UI giống hệt hàng "Vị trí toast"); mặc định Trên = vị trí native của YouTube. Chọn Dưới → extension di chuyển nguyên cụm `yt-live-chat-banner-manager` (chứa `#visible-banners`) xuống ngay sau cột chat (`#chat`), đặt trước khung nhập tin — tin ghim hiện ở dưới list thay vì trên; banner renderer riêng lẻ không bị đụng nên pin/gập/hủy ghim của YouTube vẫn hoạt động bình thường.
- Đổi lại Trên sẽ trả banner về đúng slot gốc YouTube (ghi nhớ vị trí trước khi di chuyển lần đầu). YouTube tự dựng lại banner (đổi kênh, rebuild) thì observer debounce 150ms áp lại vị trí; mọi lần áp đều qua canonical check (chỉ đụng DOM khi chưa đúng chỗ) — không thể tự lặp vô hạn.
- Áp dụng tức thì khi bấm ô chọn (storage change); popup i18n thêm `popupBannerPosition`/`popupBannerTop`/`popupBannerBottom` vi/en.
- Kiểm chứng: build sạch; test banner mới 7/7 (top giữ nguyên / bottom sau `#chat` / trả về top / idempotent / manager bị dựng lại được áp lại); harness 24/24; picker 35/35; cache 11/11; dock/preview 18/18; popup badge 9/9.

## 1.0.103
- **Badge cập nhật trên popup**: đầu card "Cài đặt" hiển thị trạng thái so với release mới nhất trên GitHub (API `releases/latest`): bằng phiên bản → hiện không gì cả; cũ hơn → chữ vàng nhấp nháy "Cập nhật mới!!! x.y.z" bấm mở trang releases; mới hơn (bản dev) → nhãn tím tĩnh "dev-build". Fetch gọi thẳng từ popup (GitHub API trả CORS `*`, không cần thêm quyền host); tag không đúng dạng semver hoặc API lỗi thì badge ẩn im lặng.
- **i18n**: thêm key `popupNewUpdate` (vi "Cập nhật mới!!!" / en "New Update!!!") và `popupDevBuild` ("dev-build"); đổi ngôn ngữ trong popup badge cập nhật theo.
- Kiểm chứng: build sạch; test popup badge mới 9/9 (5 trạng thái: cũ hơn / bằng / dev / tag lạ / API lỗi); harness 24/24; picker 35/35; cache 11/11; dock/preview 18/18.

## 1.0.102
- **`:` không còn gọi nhầm emote extension**: gõ `:yt` + Tab từng hoàn tất thành emote custom `yt-chat-mgmt` (trùng tiền tố "yt") — dấu `:` là namespace emoji của YouTube, giờ luồng Tab "từ trần" bỏ qua token bắt đầu bằng `:` để YouTube tự xử lý native; từ trần không dấu vẫn hoàn tất emote custom như cũ (`|` = mọi nguồn, `[` = custom, `:` = YouTube).
- **Chuột phải không bị nuốt nữa**: các mousedown handler của nút 7TV (icon + avatar), item emote trong grid 7TV và suggest picker trước đây `preventDefault` cho cả chuột phải/m giữa — giờ chỉ can thiệp **chuột trái** (`e.button !== 0` thì bỏ qua), để menu chuột phải native mở bình thường thay vì bị chặn.
- **Hint ký tự gọi emoji**: title card "Cài đặt 7TV" trong popup có thêm ghi chú đẩy sang phải "Ký tự gọi emoji: |" (i18n `popup7tvTrigger` vi/en).
- Kiểm chứng: build sạch; harness 24/24 (thêm test `:` + Tab); picker 35/35; cache 11/11; dock/preview 18/18.

## 1.0.100
- **Toast đè lên chat thay vì đẩy chat**: container `#ytccc-toasts` chuyển từ in-flow sang `position: absolute` (trong chính tài liệu chat) — stack không còn chiếm chỗ làm list chat bị xê dịch mỗi khi toast xuất hiện; `z-index` tối đa từ trước giờ mới thực sự có tác dụng (box static bỏ qua z-index). Anchor theo lựa chọn qua class `.ytccc-dock-top`/`.ytccc-dock-bottom` (top 8px / bottom 8px, lệch trái 12px, `width: fit-content` bám size toast); vẫn dock trong `#chat` của `yt-live-chat-renderer` như 1.0.99 nên không thể tràn sang frame chính.
- **Rỗng = chiếm 0 chỗ**: `#ytccc-toasts:empty` → ẩn hẳn (`display:none`, width/height 0, bỏ margin).
- **Toast preview theo thời lượng cài đặt**: preview khi đổi vị trí toast dùng đúng `botToastSeconds` (mặc định 10s) thay vì 4500ms cứng.
- **Trigger `[` cho emote custom (emotes.json)**: gõ `[tên` mở suggest picker như `|` với 7TV, nhưng pool riêng chỉ gợi ý emote custom (`|` vẫn gợi ý mọi nguồn như cũ); gõ đủ `[yt-chat-mgmt` tự thành emote (tự thêm space), Tab/Enter/mũi tên/bấm trên picker hoạt động như flow `|`.
- **Sửa sót ký tự trigger khi gõ đủ tên**: gõ đủ `|sangroll` từng để lại dấu `|` trong tin nhắn gửi đi (slice `before` sai chỉ số sau ký tự trigger); giờ cả `|` lẫn `[` đều bị xoá sạch khi tự hoàn tất.
- Kiểm chứng: build sạch; harness 23/23 (thêm 7 test: `[` picker/pool 7TV-autoconvert/Tab + không sót `|`/`[`); picker 35/35; cache 11/11; dock/preview 18/18 (thêm `:empty`, class dock, duration theo setting).

## 1.0.99
- **Tùy chọn vị trí toast trong popup**: hàng "Vị trí toast" với 2 ô vẽ SVG (toast docked ở **trên** hoặc **dưới** cột chat) — chọn 1 trong 2, container `#ytccc-toasts` được dock vào trong `#chat` của YouTube (con đầu/cuối, class `.ytccc-docked`, in-flow thật chứ không phải overlay); không tìm thấy `#chat` thì fallback về overlay nổi trên `body` như cũ.
- **Preview khi đổi lựa chọn**: đổi vị trí là toast preview tự hiện ngay trong chat YouTube — avatar là icon extension, tên `yt-chat-mgmt`, nội dung i18n kèm link GitHub (`toastPreviewBody` vi/en, URL tự thành link bấm được); manifest thêm `icons/*` vào `web_accessible_resources`.
- **Khoá toast trong phạm vi chat renderer**: frame chính của Studio / trang watch (cũng chạy content script, và có thể mang `id="chat"` riêng) từng làm toast tràn ra ngoài chat (overlay full-width đáy Studio, toast đè lên đầu cột chat watch). Giờ tra cứu `#chat` chỉ trong `yt-live-chat-app yt-live-chat-renderer`; không có chat renderer thì **không hiện toast** (bỏ hẳn fallback nổi trên `body`, container luôn in-flow trong `#chat`).
- Phát hiện + sửa harness 16-test còn trỏ nhầm `dist` của thư mục cũ (v1.0.70) — giờ test đúng bundle hiện tại; thêm test riêng cho dock/preview (12/12). Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.98
- **Đổi tên thư mục `src/shared` → `src/language`** (cập nhật toàn bộ import trong source + docs), kèm **README hướng dẫn tự thêm ngôn ngữ mới** (`src/language/README.md`): copy locale, dịch value, đăng ký `LanguageCode` + `LOCALES`/`LANGUAGES`, build.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.97
- **Nút "Báo lỗi" trong footer popup thay cho chữ "Language"**: kiểu nút GitHub (icon issue-opened SVG + chữ, i18n `popupReportIssue` vi/en) — bấm mở trang tạo issue mới `github.com/AppleSang/yt-chat-mgmt/issues/new` (qua `chrome.tabs.create`, không cần quyền tabs). Select đổi ngôn ngữ giữ nguyên bên cạnh.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.96
- **Ẩn bot không còn phụ thuộc công tắc dọn chat**: nhánh bot trong `processMessage` được dịch lên trước cổng `config.enabled` — tắt "Cleanup commands" vẫn ẩn bot + hiện toast (toast theo riêng `botToastSeconds`). Cleanup lệnh `!` vẫn tuân theo công tắc như cũ.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.95
- **Emoji trong ô nhập không còn "về text" khi rời focus**: YouTube (và flush của extension khi click ra ngoài) rebuild ô nhập về chữ thường; giờ khi quay lại field đã từng chứa emote (`focusin`) hoặc paste (`insertFromPaste`), token khớp **chính xác** keyword (cả 7TV) được dựng lại thành ảnh. Giữ nguyên flush khi gửi (Enter/nút send) nên tin nhắn vẫn đi ra text thuần.
- **Ẩn dấu "-" khi Ctrl+A**: span ẩn chứa keyword (1px, transparent) bị màu selection mặc định của Chrome đè lên thành vệt nhỏ; chuyển sang class `.ytccc-emote-t` + `::selection { color:transparent; background:transparent }` → vô hình cả khi bôi đen, copy vẫn đúng.
- Panel click vẫn chèn text thuần như thiết kế (cờ `skipRestore` chặn re-render trong lúc insert); test picker bắt được va chạm này trước khi ship.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.94
- **Sửa toast bot bị cắt ngắn tin nhắn**: gốc rễ — body toast bị `text.slice(0, 80)` tại `commands.ts` nên tin nhắn dài (VD quảng cáo nhiều link) đứt giữa chừng ("| htt"); bỏ giới hạn — `showToast` đã tự linkify URL + wrap đầy đủ.
- **Guard chống spam chữ**: CSS `.ytccc-body` thêm `max-height: 40vh` + `overflow-y: auto` — tin nhắn bình thường không đổi, chỉ tin nhắn cực dài mới cuộn thay vì phình to che màn hình.
- Kiểm chứng: build sạch, harness 16/16.

## 1.0.93
- **Sửa icon đầu chữ "Settings" trong popup**: trước đây trỏ `icons/icon48.png` — file đó là thiết kế CŨ (ô đỏ dấu "!"); đổi sang `icons/icon128.png` đúng thiết kế vòng chấm đỏ + play + "mgmt". Manifest không dùng icon16/48 (đã map hết sang icon128 nên toolbar unaffected).
- Kiểm chứng: build sạch.

## 1.0.92
- **Chấm dứt lỗi console "Unsafe attempt to load URL https://7tv.io/..."**: fetch 7tv.io chuyển từ content script (bị frame-origin check của live_chat iframe ghi lỗi) sang **background service worker** (`ytccc-fetch-7tv` qua `chrome.runtime.sendMessage`, `encodeURIComponent(id)`; host permission `https://7tv.io/*` đã có sẵn). Content script chỉ nhận JSON trả về.
- **Tooltip 2 dòng kiểu Bitwarden**: `name` = "yt-chat-mgmt — Quản lý Live Chat YouTube", `short_name` = "yt-chat-mgmt" (dòng nhỏ); bỏ `action.default_title` để Chrome hiển thị tooltip name + short_name.
- **Icon extension trước chữ "Settings"** trong popup (img `icons/icon48.png` 16px, cùng style card-head với mục 7TV).
- Test mocks (picker + cache) chuyển sang trả dữ liệu set qua `ytccc-fetch-7tv`; đếm fetch ở handler mock.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.91
- **Tổng của progress bar = emote 7TV global + các user đang thêm** (đúng định nghĩa của user): cache-fill lọc theo set đang cấu hình — entry của user **đã remove** không còn "sống lại" qua cache, không render và không tính vào total.
- Cache chứa entry của set bị remove → bị coi là **không fresh** → fetch + writer rewrite tự purge (fetch thêm 1 lần duy nhất sau khi xoá user, xong thì hết).
- Boot-apply từ cache cũng lọc theo set cấu hình → emote của user đã xoá không hiện trong phiên mới.
- Test thêm scenario 3 trong `picker-stv-cache-test.js` (stale entry → refresh, không render, total purge đúng) — cache test giờ 11/11.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.90
- **Stats: bỏ hàng "RAM (tab live chat)"** (popup + content-script responder xoá sạch — popup không còn gọi tabs.sendMessage).
- **Thanh progress công việc cache** trong card Stats: `đã cache / tổng emote` (writer lưu `total`/`w2x`/`w4x` cạnh cache), fill % theo nhịp, ẩn khi không có job đang chạy.
- **ETA dự đoán** cạnh thanh: theo nhịp ghi cố định (30 emote/3s = 10/s), **bao cả pass 4x đang chờ** (`(total − w2x) + pending4x`, format `Xs` / `Xp Ys`). Key i18n `popupStatEta` (vi + en), bỏ key `popupStatRam` ở cả hai file.
- **Nới nhịp ghi: 10 → 30 emote / 3 giây**.
- **Resume đầy đủ các pass**: cache lưu counter `w2x`/`w4x` — reload giữa chừng của pass 1 hay pass 2 đều tiếp tục đúng chỗ (điều kiện resume là prefix-match keyword của list, không còn đòi bằng đúng chiều dài).
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35, cache 8/8.

## 1.0.89
- **Cache emote 7TV bản an toàn** (theo spec người dùng — mỗi tick ghi 10 emote mỗi 3 giây, 2x trước rồi 4x):
  - **Chunked writer**: pass 1 ghi entry 2x (10/tick, 3s/tick); bật 4x thì pass 2 lấp `fileHq` 10/tick cho tới khi xong (`done4x`). Cache fresh + hoàn tất (TTL 1h) → boot apply ngay từ cache, **không đụng 7tv.io**; cache thiếu 4x → vẫn fetch → writer chạy tiếp (resume pass 2 nếu list trùng keyword, không ghi lại từ đầu).
  - **4x chỉ render khi cache 4x xong** (`emoteHqReady` gate trong `emoteSrc`); hoàn tất thì swap src đã render sang 4x ngay. Bật 4x giữa phiên có dữ liệu in-memory → writer chạy pass 2 luôn không cần fetch lại.
  - **Popup**: cảnh báo dưới toggle 4x — "Đang chạy emoji 2x — đang cache 4x, xong sẽ tự chuyển" — hiện khi 4x bật mà `done4x` chưa xong, tự mất khi cache xong (poll 3s). Key i18n `popupEmoteHqWarn` (vi+en).
  - **Card Stats dưới Log**: dung lượng cache (đọc `emoteStvCache`, format B/KB/MB) + số emote + **RAM tab live chat** (content script trả `performance.memory.usedJSHeapSize` qua `chrome.runtime.onMessage` `ytccc-stats`), popup poll 3s.
  - **3 safeguard chống treo kiểu 1.0.86**: đăng ký `emoteUrls` khi apply cache (bug cũ — 7TV thành text thường); boot-cache apply hoãn build pattern + sweep sang `requestIdleCallback` (timeout 1s, generation counter chống apply cũ đè apply mới); fetch hỏng → giữ nguyên cache, không ghi đè.
  - **Bug thật tìm thêm trong quá trình test**: fetch parse cũ dedupe chống list hiện tại (đã chứa entry cache) → `added` rỗng → writer không bao giờ chạy, 4x treo vĩnh viễn. Đổi sang batch-internal dedupe + merge cache∪fetch (fetch thắng, cache lấp chỗ trống).
  - Test mới `picker-stv-cache-test.js` 8/8: fresh cache skip network / apply ngay / url đăng ký đúng / thiếu 4x vẫn 2x rồi swap 4x / done4x persist.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35 + cache 8/8.

## 1.0.88
- **Tách nhóm 7TV trong popup**: "Thêm user 7TV" + "Emoji chất lượng cao (4x)" dời sang card riêng "Cài đặt 7TV" (en: "7TV settings"), tiêu đề có **logo 7TV SVG** (cùng path đã crop của picker, fill trắng) phía trước tên mục. Các mục dọn chat giữ nguyên card "Cài đặt".
- i18n key mới `popup7tvCard` cho cả vi + en.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35.

## 1.0.87
- **Hoàn tác cache emote 7TV (v1.0.86)** theo phản hồi người dùng: tab bị treo / CPU + RAM tăng vọt khi bật cache.
  - Gốc rễ đã xác minh: cache chỉ lưu `{keyword, file, fileHq}` nhưng **không đăng ký URL vào map `emoteUrls`** — luồng cache-hit trả về trước fetch nên `emoteSrc()` trả `""`; may là luồng render message có guard `if (hit && src)` nên chỉ hiện text thường (7TV mất hình, không img rỗng). Đóng góp phần treo: `storage.local.set` payload cả nghìn emote (clone + ghi leveldb ngay trong process của trang) + build pattern full-list và quét toàn document ngay lúc boot khi trang đang hydrate.
  - Trả `load7tvEmotes` về hành vi fetch 7tv.io trực tiếp như 1.0.85; bỏ key `emoteStvCache` trong code (nếu có rác trong storage.local của user thì chỉ nằm đó, không còn được đọc/ghi).
  - Nếu sau này muốn gia tốc lại: cần đăng ký `emoteUrls` khi apply cache + hoãn build pattern/sweep sang `requestIdleCallback` + cache từng set một. Chờ user quyết định.
- **Giữ nguyên khôi phục trạng thái popup (v1.0.86)**: làm đúng ý đã xác nhận — Chrome luôn hủy popup khi đóng nên cách duy nhất để "xuất hiện lại cái hồi nãy" là lưu state (query + kết quả search 7TV) rồi nạp lại khi mở popup.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35.

## 1.0.86
- **Tạm ẩn setting "Mods can create polls" khỏi popup** (theo yêu cầu — sẽ tính lại sau): chỉ gỡ control UI khỏi popup.html + wiring popup.ts; storage key `modPoll` và feature bên content script **giữ nguyên** (ai đã bật vẫn hoạt động).
- **Mở lại popup khôi phục trạng thái đang dở** thay vì reset về mặc định: query + kết quả search 7TV lưu vào `storage.local` (`popupViewState`) mỗi lần search; mở popup lại → ô search + result cards hiện y như trước khi đóng; thêm user xong thì state được clear.
- **Gia tốc tải emote 7TV (stale-while-revalidate)**: list emote đã parse được cache vào `storage.local` (`emoteStvCache`, TTL 1h, kèm bộ set ids) — lần mở trang sau emote **có sẵn ngay lập tức** không chờ 7tv.io; nếu cache >1h hoặc đổi set ids thì vẫn hiển thị cache cũ trong lúc refresh nền, xong tự swap; custom emote luôn thắng keyword trùng. Cache ghi fail (quota) thì fallback về fetch như cũ.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35.

## 1.0.85
- **Cân hàng category icon**: nút 7TV/avatar 40px làm hàng giãn ra trong khi nút YouTube (~36px) thấp hơn → icon ta bị tụt xuống. Giờ **đo chiều cao nút YouTube thật** (`getBoundingClientRect` của `yt-emoji-picker-category-button-renderer`) rồi copy nguyên size (fallback 36 khi chưa layout); có sync khi size đo được thay đổi. Thêm `align-self:center;vertical-align:middle` để bất kể row dùng kiểu alignment nào nút ta cũng nằm giữa trục hàng.
- **Icon 7TV đủ cỡ**: favicon gốc có 24/128 đơn vị padding trong suốt quanh glyph nên logo "7" chỉ render ~15px trong khung 24px (nhỏ rõ so với icon YouTube). Crop `viewBox` đúng bounds glyph (`8 24 108.148 80`) → glyph lấp đầy khung 24×24 như icon thường.
- Kiểm chứng: build sạch, harness 16/16, jsdom picker 35/35 (size 36 fallback + align-self center, viewBox crop).

## 1.0.84
- **Fix gốc rễ ô nhiễm field (spam click vỡ chữ)**: picker popup nằm **bên trong** `yt-live-chat-message-input-renderer`, nên guard `closest("#input, #textbox, yt-live-chat-message-input-renderer")` coi cả element trong picker (item emoji, path SVG nút 7TV, ô search) là ô chat → `lastField` bị chiếm → spam click chèn text vào chính item/SVG (chữ chồng chữ, `data-ytccc-emote-field` dính lên path). Giờ `isInputField`/`markEmoteField`/listener click đều **loại subtree picker**, và click chỉ cập nhật `lastField` khi target nằm trong element thật sự editable.
- **Click emoji hiện text ngay không cần bấm ô chat trước**: `getInputField` tìm contenteditable bất kỳ giá trị attr bên trong input renderer (thay vì `[contenteditable='true']` cứng + `#textbox`/`#input` toàn cục dễ trúng element sai), fallback phải `isContentEditable`.
- **Spam click ra từng emote riêng**: mỗi click chèn `keyword + dấu cách` (trước đây dính cụm → chỉ ra 1 emote); fallback append không xoá space/text cũ, caret đặt sau synthetic input để click tiếp luôn nối đuôi.
- **Không còn "reload" danh sách emoji khi gửi/định kỳ**: panel mới (picker bị đóng/tái tạo sau khi gửi) khởi tạo ở trạng thái gốc — đóng panel + xoá search, không tự mở lại/refetch grid; hệ quả phụ của bug field (flush cascade trên element picker) cũng hết.
- Icon 7TV **fill trắng cứng** (picker luôn nền tối), ảnh avatar về **24×24** đều với icon. Kiểm chứng: build sạch, harness 16/16, jsdom picker 33/33 (spam click `kw kw kw `, không bẩn DOM picker, panel mới khởi động đóng).

## 1.0.83
- **Nút 7TV + avatar user về lại `#category-buttons`** (theo yêu cầu): 1.0.79 chèn nút vào **giữa** các button do Polymer stamp (trong range dom-repeat) — nghi là gốc làm hỏng render; bản này append vào **cuối hàng** (ngoài range repeat) và chỉ re-pin khi nút thực sự biến mất → inject ở trạng thái ổn định không mutate gì. Nút 40×40 khớp hàng, icon kế thừa màu icon category YouTube (currentColor, bỏ color cứng).
- **Click emoji chèn TEXT vào ô soạn** thay vì img ẩn: click emoji trong panel/kết quả search chèn keyword dạng text trần (giống hệt cái `flushEmoteField` để lại trước khi gửi — tin nhắn render emote như gõ tay, không lộ ký tự `|`); dispatch synthetic `input` (bị ignore nội bộ) để model send của YouTube ghi nhận text.
- **Thanh search của picker lọc emote 7TV**: gõ vào ô search gốc → panel tự mở hiện kết quả 7TV (header i18n mới `pickerStvSearch` + `pickerStvNoResults` cho cả vi/en); xoá query → panel đóng lại; bấm nút 7TV/avatar khi đang search sẽ thoát search mode (xoá ô search, YouTube tự reset grid của nó).
- Xoá state `stvCompanion`; dọn legacy hàng companion `.ytccc-stv-row` mỗi lần inject. Kiểm chứng: build sạch, harness 16/16, headless jsdom picker 29/29 (nút trong hàng, không đụng 3 button Polymer, panel sibling, chèn text + không img, search mở/lọc/hint/đóng, dọn legacy, sweep không nhân bản).

## 1.0.82
- **Icon 7TV dùng logo chính thức**: thay mặt cười vẽ tay bằng SVG lấy từ `https://7tv.app/favicon.svg` (logo số 7, 3 path gốc, viewBox 128). Fill đổi sang `currentColor` (bỏ `black` + style dark-scheme của favicon) để icon bám màu icon category YouTube ở mọi theme.
- **Bỏ section custom emote trong picker** (`div.ytccc-catalog-section` cuối picker emoji): custom emote chỉ còn truy cập qua lệnh `|keyword`/suggest picker của extension — picker của YouTube trở về nguyên trạng. Dọn sạch section còn sót từ phiên bản cũ mỗi lần inject; dọn luôn class chết `.ytccc-custom-emoji` khỏi selector mousedown + flush exception.
- Kiểm chứng: build sạch, harness 16/16, headless jsdom picker 25/25 (cấu trúc companion, panel, toggle, chèn emote, dọn legacy, sweep không nhân bản).

## 1.0.81
- **Fix picker hỏng + không cuộn được**: nguyên nhân gốc là chèn nút 7TV/avatar **vào trong** `#category-buttons` — Polymer quản lý mọi con của hàng này (dom-repeat), element lạ làm render hỏng (icon đổ thành text, tooltip lộ cả hàng) và section chèn trong list emoji khiến cuộn kẹt.
- **Cấu trúc mới an toàn Polymer**: nút 7TV + avatar đặt trong **hàng riêng liền kề** (sibling ngay dưới `#category-buttons`, canh giữa giống hàng gốc — không đụng children do Polymer quản); panel emoji là sibling có **scroll container riêng** (`max-height:280px;overflow-y:auto`) nên cuộn/lướt không phụ thuộc list nội bộ của YouTube.
- **Icon 7TV đổi sang SVG** (mặt cười vuông bo góc, `currentColor`) giống phong cách các icon category khác thay cho badge chữ "7TV".
- Panel **mặc định đóng**: bấm icon 7TV/avatar để mở (bấm lần nữa toggle đóng); bấm category của YouTube tự đóng panel để picker hành xử như gốc. Dọn artifact phiên bản cũ (nút trong hàng Polymer, section trong grid) mỗi lần inject.
- Kiểm chứng headless jsdom 25/25: hàng companion là sibling, hàng Polymer không bị biến đổi, icon SVG, panel mặc định ẩn, mở/đóng/đổi nguồn Global↔user, highlight, chèn emote, dọn legacy, click panel không flush nội dung ô soạn, sweep không nhân bản.

## 1.0.80
- **Fix nút 7TV không hiện trong picker**: picker thật của YouTube là `yt-emoji-picker-renderer` với hàng `#category-buttons` (không phải `yt-live-chat-emoji-picker-renderer`/`tp-yt-...`) → `findPicker` không tìm thấy nên không inject gì cả. Thêm tag thật vào `findPicker`, ưu tiên `#category-buttons` trong `findCategoryRow`, và container qua parent của `yt-emoji-picker-category-renderer`.
- Observer (index.ts) giờ nhận cả 3 biến thể picker tag nên inject chạy ngay khi picker mở, không đợi sweep 3s.

## 1.0.79
- **Tích hợp 7TV vào emoji picker của YouTube**: hàng category icon giờ có thêm **nút 7TV** chèn giữa icon hội viên (★) và YouTube (▶) — bấm hiện list emoji **7TV Global**; **cuối hàng** là **avatar của các user 7TV đã thêm** trong popup — bấm hiện đúng **emoji-set của họ**.
- `Emote` thêm `setId` (global / user set id) để tách list global vs từng user; panel grid ở cuối picker, bấm emoji chèn vào ô soạn như custom emote; nút đang chọn được highlight.
- Nạp `emoteUsers` từ storage vào content script (tự refresh khi popup thêm/xoá user); nút tự ghim lại khi Polymer tái render (signature check, không nhân bản).
- Kiểm chứng headless jsdom 15/15: vị trí nút, avatar cuối hàng, panel global/user-set, click chuyển nguồn, highlight, chèn emote, sweep không nhân bản.

## 1.0.78
- **Fix poll option có emote bị nhấp nháy (flicker)**: nguyên nhân gốc là giành giật childList — extension chèn `img` + bọc text vào span ẩn, Polymer của YouTube tái render nhãn (ghi đè text / thay subtree) → text lộ ra → sweep convert lại, lặp đi lặp lại (raw → emote → trống).
- **Chiến lược CSS-static mới**: đánh dấu element cha của nhãn bằng `data-ytccc-emote` + CSS var `--ytccc-emote`; text Polymer ghi đè thoải mái (luôn bị ẩn bởi `color/font-size`), emote vẽ bằng `::before` từ var. Zero childList mutation phía extension → observer (chỉ theo dõi childList) không bao giờ phản ứng với ta, YouTube replace-all hay append text trùng cũng không đổi giao diện.
- Nhãn cha chứa thêm nội dung (không chỉ keyword) → fallback về path img+span ẩn cũ; poll kết thúc gỡ mark + khôi phục text; đổi "Emoji chất lượng cao" refresh luôn var của nhãn đã mark.
- Kiểm chứng headless jsdom 12/12: mark đúng 3 nhãn, không imgs, không tăng qua sweep/update-in-place/replace-all/append-trùng, ended gỡ sạch mark + text hiển thị lại, engagement giữ path cũ.

## 1.0.77
- **Fix toast/log sai link vì YouTube cắt nhãn**: link dài trong live chat bị YouTube rút gọn text thành `...` (vd `https://www.facebook.com/groups/94833...`) và bọc URL thật trong `href` dạng `/redirect?...&q=<url-encoded>`. `getMessageText` giờ decode param `q` để lấy URL gốc (bỏ wrapper redirect của YouTube); anchor không phải redirect giữ nhãn hiển thị như cũ.
- Trích text qua bản clone `#message` thay thế anchor bằng text URL thật — không đụng DOM live (an toàn với Polymer/observer/pipeline emote).
- Áp dụng cho toàn bộ nguồn dùng `getMessageText`: toast bot, toast "Cleaned", log tin bị xoá.

## 1.0.76
- **Tùy chọn mới "Emoji chất lượng cao (4x)"** dưới mục "Thêm user 7TV" trong popup: bật → mọi emote 7TV render từ variant `4x.webp`, tắt → `2x.webp` (mặc định, hành vi cũ). Custom emote (emotes.json) không có variant nên không bị ảnh hưởng.
- `build7tvUrl` trả cả URL thấp (`2x.webp`, giữ thứ tự ưu tiên cũ) lẫn cao (`4x.webp`) ngay khi load set; `emoteSrc` chọn theo cờ `emoteHq` (storage.sync).
- Emote đã render thành `<img>` không rebuild được từ text (text đã bị thay), nên đổi công tắc swap trực tiếp `src` của các img khớp URL cũ — observer chỉ theo dõi childList nên không có vòng lặp mutation.

## 1.0.75
- **Fix create_poll lỗi "Origin doesn't match Host"**: `createPollViaApi` (và `deleteViaApi`) set `x-origin` đúng với origin của API endpoint (`https://www.youtube.com`) thay vì `location.host` (tránh mismatch khi content script chạy trên studio).

## 1.0.73
- **Fix Tab auto-complete emote (`:app` / bare word)**: `tabComplete` giờ nhận cả prefix `|` lẫn từ khóa thuần (kể cả bắt đầu bằng `:` như `:app`) → nhấn Tab convert thành emote tương ứng (vd `:app` → `apple`); giữ text trước + không thêm dấu cách (R5.2).
- **Fix Tab bị chặn khi `@` mention**: keydown Tab chỉ `preventDefault`/`stopPropagation` khi thực sự hoàn thành thành emote; khi không khớp thì để mặc định chạy để YouTube xử lý autocomplete mention (`@channel`) của mình.

## 1.0.72
- **Fix copy emote trong ô soạn**: clipboard giờ chỉ chứa một keyword và dấu cách thường sau emote (ví dụ `longaodance `), không còn nhân đôi tên do trình duyệt tuần tự hoá đồng thời `img.alt` và span nguồn ẩn.

## 1.0.71
- **`!poll` tạo được ngay lần đầu trên Studio**: `inject.ts` tự giải mã payload protobuf trong URL `continuation` để dựng đúng `create_poll.params`, nên không còn bắt buộc tạo một poll thủ công để warm-up.
- **Nguyên nhân gốc**: Studio đã mang đủ context kênh/live video trong continuation, nhưng code trước chỉ chờ bắt request create_poll nên luôn thiếu params ở phiên chưa từng tạo poll.
- Giữ request-capture, cache và quét `ytInitialData` làm fallback nếu YouTube đổi định dạng continuation hoặc dữ liệu trang không có payload hợp lệ.

## 1.0.70
- **`!poll` không cần warm-up lại mỗi phiên**: params/context của create_poll bắt được từ lần tạo bình chọn thủ công được **cache trong `chrome.storage.local`** (`pollParams`, `pollContext`) và seed lại vào dataset khi boot — tạo bình chọn thủ công **một lần duy nhất**, các phiên sau `!poll` tự hoạt động.
- `inject.ts` bắt thêm body nằm trong **Request object** (clone + text) chứ không chỉ `init.body`.
- Toast lỗi `!poll` giờ nêu **rõ lý do** (thiếu params / HTTP status / lỗi mạng) thay vì thông báo chung.

## 1.0.69
- **Fix `!poll` báo sai "không phải mod/chủ kênh"**: `getRole` giờ đọc `author-type` trên chính message renderer / `#author-name` (marker vai trò chuẩn của YouTube: owner/moderator/member), cộng các tầng dự phòng: badge có attr `type="owner|moderator"` (kể cả khi nằm ngoài `#author-badges`), annotation `data-ytccc-role`, và cuối cùng là tooltip/aria-label bản địa hoá ("Chủ sở hữu"/"Owner"/"Quản trị viên"...).
- Thêm `waitForRole`: chờ tối đa 2s cho inject.ts (main world) annotate vai trò trước khi kết luận viewer, tránh race khi tin vừa xuất hiện.
- Badge `type` chính xác trong DOM giờ **thắng** annotation thô — owner bị annotate nhầm "member" vẫn được phép tạo poll.
- `getMessageText`/author lookup dùng `qsOne` (querySelector + fallback querySelectorAll) — phòng thủ id-fast-path của nwsapi (jsdom).

## 1.0.68
- **Tính năng mới — Mod tạo cuộc bầu chọn (`!poll`)**: bật toggle "Mod có thể tạo cuộc bầu chọn" trong popup (`modPoll`, mặc định tắt). Mod/chủ kênh gõ `!poll "câu hỏi" "lựa chọn 1" "lựa chọn 2" ...` (ngoặc kép, tối thiểu 3 trường) → extension **của chủ kênh** tạo poll qua youtubei `live_chat/create_poll` (SAPISIDHASH như moderate). `inject.ts` (main world) hook fetch/XHR bắt `params` + `context.client` từ lần tạo poll thủ công của chủ kênh (dự phòng: quét sâu `ytInitialData`); thiếu params → toast hướng dẫn; sai vai trò/thiếu trường → toast lỗi. Tin `!poll` vẫn được dọn như lệnh thường.
- **Fix gốc rễ emoji poll nhân bản mỗi giây**: vòng lặp targets thiếu bước bỏ qua node text đã ẩn trong `span[data-ytccc-poll-src]` → mỗi pass convert LẠI node đang ẩn, lồng img/span vào nhau vô hạn (nguyên nhân RAM tăng). Nay convert chỉ nhắm node text thô.
- **Poll chuyển sang chiến lược binding-safe**: giữ nguyên text node của Polymer (bọc span ẩn — Polymer cập nhật `node.data` tại chỗ, không phát thêm text raw), thay vì xoá/ve lại; node text trùng YouTube append cạnh cặp sẵn có → bỏ (dedup, kể cả khi raw chèn giữa img và span).
- **Fix emote không hiện trong poll kết thúc**: `applyEmotes` nhận trực tiếp element `#message` (path engagement) bị bỏ qua — nay xử lý đúng; thêm `#message` (engagement) vào sweep 3s + quét lại toàn bộ khi emote load xong (`ytccc-emotes-loaded`).
- Test mới: harness poll jsdom 8/8 (convert 1 lần, không tăng khi Polymer update-in-place/replace-all/append-trùng/raw-chèn-giữa, ended trả text thuần, engagement chỉ emote tiêu đề) + harness `!poll` 7/7 (parse câu hỏi/options/params, chặn sai cú pháp/vai trò).

## 1.0.67
- Card tổng kết poll (`yt-live-chat-viewer-engagement-message-renderer`): **chỉ dòng tiêu đề câu hỏi** (span `style-target="bold"`) được render emote — các dòng câu trả lời ("label (0%)") và dòng "đã xong" giữ text thuần (trước đây path `#message` thường làm emote cả option).

## 1.0.66
- **Poll render emote (bản ổn định)**: `applyPollEmotes` viết lại thành state machine — chỉ mutate DOM khi card **chưa canonical** (có text raw mới do YouTube tái thêm, hoặc poll chuyển sang ended) → không thể tạo vòng lặp mutation observer (nguyên nhân treo + RAM tăng ở 1.0.63/64).
- Khôi phục poll **không phụ thuộc adjacency**: xoá mọi `img[data-ytccc-poll]` + thay mọi `span[data-ytccc-poll-src]` bằng text gốc.
- Dọn cả img emote "mồ côi" do content script bản cũ để lại (nhận qua alt/title trùng keyword).
- Observer xử lý poll lại qua **debounce 150ms** (text raw do YouTube tái thêm mỗi ~1s được chuyển thành emote nhanh), bỏ qua batch chứa artifact của mình.
- Viết bộ docs: DESIGN_SYSTEM.md, UI_UX_GUIDELINES.md, REQUIREMENTS.md, FEATURES.md, ARCHITECTURE.md, DATABASE.md, AGENTS.md, CHANGELOG.md.

## 1.0.65
- Sweep poll xoá mọi img emote trong card (kể cả img không-mark của script cũ) rồi vẽ lại đúng 1 lần.

## 1.0.64
- Bỏ xử lý poll khỏi MutationObserver (chỉ sweep 3s) — fix vòng lặp vô hạn gây treo trang + RAM tăng (chrome.exe 1.5GB+).
- `applyPollEmotes` không mutate khi không có gì để làm.

## 1.0.63
- Poll: xử lý idempotent — mỗi pass xoá emote cũ trước khi vẽ lại; poll kết thúc (text dạng "label (0%)") trả về text thuần.
- Emote poll giữ text gốc trong `span[data-ytccc-poll-src]` ẩn + `img[data-ytccc-poll]`.

## 1.0.62
- Render emote trong thẻ poll chat (`yt-live-chat-text-poll-renderer`, `yt-live-chat-poll-renderer`) — câu hỏi + lựa chọn.

## 1.0.61
- Flush khi submit: **tự theo dõi field đã chứa emote** (Set tham chiếu trực tiếp, hoạt động cả shadow DOM — poll composer) + click ra ngoài field (nút submit...) → xả toàn bộ field về text raw + phát lại input. Click picker/catalog hoặc trong field không flush.

## 1.0.60
- Flush tổng quát khi click nút submit (đi ngước ancestor tìm field có emote).

## 1.0.59
- Fix tin nhắn gửi đi rỗng ("Bình luận của bạn quá ngắn"): flush chạy ở **window-capture** (sớm hơn listener YouTube) + phát lại `InputEvent("input")` sau khi xả để model YouTube cập nhật từ DOM sạch.
- Thực nghiệm Chrome headless xác nhận `innerText` vẫn bao gồm text ẩn → vấn đề nằm ở model input-event của YouTube.

## 1.0.58
- Hook flush khi gửi: Enter / beforeinput (insertLineBreak|insertParagraph) / click `#send-button` — xả emote về text gốc trước khi YouTube đọc.

## 1.0.57
- Sửa revert-on-extend: gộp text gõ thêm vào node khôi phục **xoá hết `\u200b`** → tin gửi đi không còn bị render `[emote]m` lởm chởm.

## 1.0.56
- Con trỏ sau chữ vừa gõ khi revert emote (merge node + caret math).

## 1.0.55
- Gõ thêm chữ dính vào emote → tự đảo về text; Backspace 1 lần xoá emote trả text.

## 1.0.54
- Wire `revertExtendedEmote` vào `onFieldInput` + Backspace branch trong keydown capture.

## 1.0.53
- Hidden span 1px transparent (thay font-size:0 làm hỏng gửi); `insertEmote` dùng DOM range; bare-name không tự thêm dấu cách; `buildEmoteFrag(kw, addSpace)`.

## 1.0.35 – 1.0.52 (tóm tắt)
- 1.0.35: freeze fix (emote re-process loop + `\u200b` skip + Set fast-check).
- 1.0.36: 7TV removed (tạm). 1.0.37: chuyển TypeScript. 1.0.38: hỗ trợ studio.
- 1.0.39–41: curtain avatar = icon extension.
- 1.0.42: bỏ footer/keepText cũ, language về footer, curtain chỉ theo autoLiveChat, tắt cleanup → reveal tin ẩn.
- 1.0.43: auto-live-chat tách khỏi toggle cleanup; "Dọn lệnh" thành checkbox; curtain icon128 vuông; thêm `hideAvatars`.
- 1.0.44: language selector là footer thật; tin `!` của owner cũng bị xử lý; đổi settings → quét lại tin hiển thị; manifest gộp pattern `https://*.youtube.com/*`.
- 1.0.45: bỏ option includeMods; luôn cố xoá + thất bại im lặng; params retry sau khi mở menu; bot list thêm `@streamlabs`; build chịu được dist bị khoá.
- 1.0.46: 7TV trở lại (CDN trực tiếp), emote trong comment/community (`#content-text`), host permission 7tv.io.
- 1.0.47–49: 7TV user search trong popup (GQL), nút +/−, danh sách user đã thêm, style input thống nhất.
- 1.0.50–52: slider toast bot 0–35s (0 = "Tắt"), xoá input sau khi thêm user, hidden span font-size:0 (đã hỏng — sửa ở 1.0.53).
