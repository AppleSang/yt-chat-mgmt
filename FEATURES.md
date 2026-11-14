# FEATURES â€” Luá»“ng hoáº¡t Ä‘á»™ng tá»«ng tÃ­nh nÄƒng

## F1. Dá»n lá»‡nh (!command) â€” `commands.ts`
1. Content script boot trÃªn trang chat (`yt-live-chat-app, #chat-items`).
2. MutationObserver báº¯t tin nháº¯n má»›i (`MESSAGE_SELECTOR`).
3. `processMessage(el)`:
   - Äá»c tÃªn tÃ¡c giáº£ + ná»™i dung (`#author-name`, `#message`).
   - Náº¿u text báº¯t Ä‘áº§u báº±ng prefix `!` â†’ lÃ  tin lá»‡nh.
   - Chá» params xÃ¡c thá»±c (`waitForParams`, tá»‘i Ä‘a 2500ms) â†’ gá»i `deleteViaApi` (POST youtubei moderate, SAPISIDHASH) â†’ tháº¥t báº¡i thÃ¬ thá»­ menu (`tryMenuDelete`, chá»‰ khi cÃ³ nÃºt menu; cÃ³ retry `waitForParams(1500)`).
   - **LuÃ´n** áº©n local (`hideLocally`) báº¥t ká»ƒ API thÃ nh cÃ´ng hay khÃ´ng; tháº¥t báº¡i thÃ¬ im láº·ng.
   - ThÃ nh cÃ´ng â†’ toast "ÄÃ£ dá»n: ..." + ghi `deletedLog` (storage.local, tá»‘i Ä‘a 200 entry).
4. Toggle `enabled` táº¯t â†’ `revealHiddenMessages()` khÃ´i phá»¥c má»i tin Ä‘Ã£ áº©n.

## F2. áº¨n bot + toast â€” `commands.ts` + `toast.ts`
1. Config botList â†’ máº£ng tÃªn (bá» @, lowercase).
2. Tin má»›i cÃ³ tÃ¡c giáº£ khá»›p â†’ áº©n local.
3. Náº¿u `botToastSeconds > 0` â†’ toast (avatar, tÃªn, role, text) trong N giÃ¢y; 0 = khÃ´ng toast.

## F3. áº¨n badge/avatar â€” `dom.ts`
- `applyBadges(el)` cháº¡y cho tá»«ng tin nháº¯n (observer) + sweep: set `display:none` theo `hideBadges`/`hideAvatars`.

## F4. Emote render â€” `emotes.ts` + `index.ts`
1. Nguá»“n: custom (`emotes.json`) + 7TV global + 7TV set cá»§a user (storage `emoteSetIds`, reload khi key Ä‘á»•i).
2. URL áº£nh: file local (`chrome.runtime.getURL`) hoáº·c CDN 7TV (`2x.webp` Æ°u tiÃªn).
3. `applyEmotes(el)`:
   - Tin nháº¯n: xá»­ lÃ½ text node trong `#message`; comment: `#content-text`.
   - Regex biÃªn tá»« (khÃ´ng khá»›p giá»¯a tá»« dÃ i), bá» qua node chá»©a `\u200b` (chá»‘ng re-process).
   - Thay keyword báº±ng `<img>` CDN.
4. Poll: `applyPollEmotes(card)` â€” binding-safe state machine: legacy img khÃ´ng mark bá»‹ xoÃ¡; poll káº¿t thÃºc (text cÃ³ `(n%)`) â†’ unwrap text gá»‘c + xoÃ¡ img; canonical check (khÃ´ng mutate khi má»i keyword Ä‘Ã£ lÃ  emote, node text náº±m trong span áº©n bá»‹ bá» qua); convert chá»‰ nháº¯m node text thÃ´: label 1 keyword â†’ **giá»¯ nguyÃªn text node** (bá»c span áº©n â€” Polymer cáº­p nháº­t táº¡i chá»—) + chÃ¨n img trÆ°á»›c span; text trá»™n nhiá»u keyword â†’ thay fragment (giá»¯ keyword trong span áº©n). Node text trÃ¹ng YouTube append thÃªm cáº¡nh cáº·p [img][span] sáºµn cÃ³ â†’ **bá» (dedup)**. Card tá»•ng káº¿t poll (`yt-live-chat-viewer-engagement-message-renderer`): chá»‰ dÃ²ng tiÃªu Ä‘á» cÃ¢u há»i (span `style-target="bold"`) Ä‘Æ°á»£c render emote, cÃ¡c dÃ²ng cÃ¢u tráº£ lá»i + footer giá»¯ text thuáº§n; `#message` cÅ©ng Ä‘Æ°á»£c xá»­ lÃ½ khi nháº­n trá»±c tiáº¿p element nÃ y.
5. Chu ká»³ xá»­ lÃ½: observer (tin nháº¯n tá»©c thá»i; poll debounce 150ms, bá» qua batch chá»©a artifact cá»§a mÃ¬nh) + sweep 3s (gá»“m `#message` engagement) + sweep khi emote load xong (`ytccc-emotes-loaded`) + sweep 300ms khi Ä‘á»•i settings.

## F5. Soáº¡n tin cÃ³ emote â€” `suggest.ts`
1. GÃµ `|abc` â†’ picker gá»£i Ã½ (mÃ³c scenario: Tab/Enter chÃ¨n + dáº¥u cÃ¡ch; ArrowUp/Down Ä‘iá»u hÆ°á»›ng; Esc Ä‘Ã³ng).
   - Tab cÅ©ng complete bare word (`:app`, `app`) khi picker Ä‘Ã³ng (fix 1.0.73, `tabComplete`).
2. GÃµ Ä‘á»§ tÃªn (`war` + Enter/cÃ¡ch gÃµ tá»± nhiÃªn) â†’ `tryAutoComplete`: thay node text báº±ng `[img][span áº©n "\u200bwar\u200b"][anchor "\u200b"]`, caret cuá»‘i field.
3. GÃµ thÃªm chá»¯ cÃ¡i â†’ `revertExtendedEmote`: emote tráº£ vá» text, gá»™p text gÃµ thÃªm (xoÃ¡ `\u200b`), caret sau chá»¯ vá»«a gÃµ.
4. Backspace táº¡i anchor â†’ `restoreEmoteToText`: xoÃ¡ cáº£ emote, tráº£ text, caret cuá»‘i tá»«.
5. Catalog (emoji picker YouTube) + picker riÃªng â†’ `insertEmote(keyword)`: thay `|token` (náº¿u cÃ³) hoáº·c chÃ¨n táº¡i caret báº±ng DOM range.
6. Copy trong Ã´ soáº¡n: clone selection, bá» áº£nh khi span nguá»“n áº©n Ä‘i kÃ¨m (hoáº·c dÃ¹ng keyword áº£nh cho selection chá»‰ cÃ³ áº£nh), xoÃ¡ `\u200b` vÃ  Ä‘á»•i NBSP thÃ nh dáº¥u cÃ¡ch trÆ°á»›c khi ghi `text/plain` vÃ o clipboard.

## F6. Gá»­i tin (flush) â€” `suggest.ts`
1. Káº¿t thÃºc soáº¡n: Enter (khÃ´ng modifier) / beforeinput insertLineBreak|insertParagraph / click `#send-button` / click nÃºt submit báº¥t ká»³.
2. `flushActiveField` / `flushTrackedFields`: má»i field tá»«ng chá»©a emote (Set `emoteFields`, hoáº¡t Ä‘á»™ng cáº£ shadow DOM) Ä‘Æ°á»£c:
   - Xáº£ `[img][span áº©n]` â†’ text gá»‘c thuáº§n, xoÃ¡ `\u200b`;
   - PhÃ¡t láº¡i `InputEvent("input")` (cá» `flushing` cháº·n handler cá»§a mÃ¬nh) Ä‘á»ƒ model YouTube cáº­p nháº­t.
3. YouTube Ä‘á»c field/model â†’ request mang text tháº­t. NgÆ°á»i cÃ³ extension váº«n tháº¥y emote trong khung chat (F4).

## F7. Tá»± chuyá»ƒn Live chat â€” `curtain.ts`
1. `ensureSwitchLoop` (gate chá»‰ `switchRunning || !config.autoLiveChat`) â†’ hiá»‡n curtain (icon128 vuÃ´ng) â†’ check/báº­t cháº¿ Ä‘á»™ Live chat â†’ set `switchStatus` (storage.local) â†’ gá»¡ curtain.
2. Popup/background cÃ³ thá»ƒ há»i tráº¡ng thÃ¡i qua `ytccc-check-mode`.

## F8. Popup â€” `popup.ts` + `popup.html`
1. `loadAll`: Ä‘á»c config + deletedLog + emoteSetIds + emoteUsers; render theo ngÃ´n ngá»¯.
2. Báº¥t ká»³ thay Ä‘á»•i â†’ `chrome.storage.sync.set` ngay (khÃ´ng nÃºt LÆ°u).
3. 7TV search: GQL `users(query,limit)` â†’ danh sÃ¡ch + nÃºt +; thÃªm â†’ lÆ°u `emoteSetIds` (csv set id) + `emoteUsers` (danh sÃ¡ch user); nÃºt âˆ’ gá»¡ theo user.
4. XoÃ¡ log â†’ `chrome.storage.local.set({deletedLog: []})`.

## F9. i18n â€” `language/i18n.ts`
1. `setLanguage(code)` chá»n báº£ng vi/en; popup render + toast + curtain dÃ¹ng key.
2. Äá»•i ngÃ´n ngá»¯ á»Ÿ footer â†’ lÆ°u sync â†’ má»i UI Ä‘á»c láº¡i.

## F10. Mod táº¡o cuá»™c báº§u chá»n (`!poll`) â€” `commands.ts` + `inject.ts`
1. `inject.ts` (main world) tá»± giáº£i mÃ£ `continuation` cá»§a Studio chat Ä‘á»ƒ dá»±ng `params` create_poll Ä‘Ãºng ngá»¯ cáº£nh kÃªnh/live video, vÃ¬ váº­y khÃ´ng cáº§n táº¡o poll thá»§ cÃ´ng trÆ°á»›c. Náº¿u continuation Ä‘á»•i hoáº·c khÃ´ng cÃ³, báº¯t request `create_poll` (fetch + XHR) do chá»§ kÃªnh táº¡o thá»§ cÃ´ng â†’ lÆ°u `params` + `context.client` vÃ o `documentElement.dataset` (`ytcccPollParams`, `ytcccPollContext`); dá»± phÃ²ng cuá»‘i: quÃ©t sÃ¢u `ytInitialData` tÃ¬m key chá»©a "poll" cÃ³ `params`.
2. Mod/chá»§ kÃªnh gÃµ `!poll "cÃ¢u há»i" "lá»±a chá»n 1" "lá»±a chá»n 2" ...` â†’ extension cá»§a chá»§ kÃªnh phÃ¢n tÃ­ch (ngoáº·c kÃ©p, tá»‘i thiá»ƒu 3 trÆ°á»ng).
3. Báº­t toggle `modPoll` trong popup (máº·c Ä‘á»‹nh táº¯t). ÄÃºng vai trÃ² (mod/owner) + Ä‘á»§ trÆ°á»ng â†’ POST `live_chat/create_poll` (SAPISIDHASH nhÆ° moderate) vá»›i `questionText`/`optionText` dáº¡ng `text_segments`.
4. Thiáº¿u `params` sau khi tá»± suy ra continuation vÃ  thá»­ má»i fallback â†’ toast hÆ°á»›ng dáº«n; sai vai trÃ²/thiáº¿u trÆ°á»ng â†’ toast lá»—i.
5. Tin `!poll` tiáº¿p tá»¥c Ä‘Æ°á»£c dá»n nhÆ° lá»‡nh thÆ°á»ng (F1).
