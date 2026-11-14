# ARCHITECTURE â€” yt-mng-extension

## 1. Tá»•ng quan
- Chrome Extension **Manifest V3**, TypeScript (esbuild bundle, khÃ´ng framework).
- ThÃ nh pháº§n: background service worker + content script (chat) + popup (action popup).
- Build: `node build.mjs` â€” cháº¡y `tsc --noEmit` (spawnSync vá»›i `process.execPath`), esbuild bundle 4 entry â†’ `dist/`, copy static tá»« `public/`. `cleanDist` best-effort (Chrome khoÃ¡ `dist\content` khi extension Ä‘ang load â†’ ghi Ä‘Ã¨ táº¡i chá»—).
- Bump version: `bump-version.ps1` (ghi `public/manifest.json`). Chrome load thÆ° má»¥c `dist/`.
- KhÃ´ng cÃ³ git repo; `_legacy/` lÃ  backup JS trÆ°á»›c khi chuyá»ƒn TypeScript.

## 2. Cáº¥u trÃºc thÆ° má»¥c
```
src/
  language/
    types.ts        # ExtensionConfig, Emote, ToastOptions, DeletedLogEntry, BgRequest...
    i18n.ts         # setLanguage, t() - chá»n báº£ng locale
    locales/vi.ts   # báº£ng tiáº¿ng Viá»‡t
    locales/en.ts   # báº£ng tiáº¿ng Anh
  background/
    index.ts        # service worker: proxy fetch resource (náº¿u cáº§n), check request
  content/
    index.ts        # boot + observers + sweeps (Ä‘iá»ƒm vÃ o content script)
    config.ts       # DEFAULTS, loadConfig, watchConfig, isBot
    commands.ts     # detect/hide/xoÃ¡ lá»‡nh qua moderate API, deletedLog, revealHiddenMessages
    dom.ts          # MESSAGE_SELECTOR, applyBadges (badge+avatar), ROLE_COLORS
    toast.ts        # toast trong vÃ¹ng chat
    curtain.ts      # auto live chat switch (overlay + icon128)
    emotes.ts       # nguá»“n emote (custom + 7TV), applyEmotes, applyPollEmotes, EMOTE_TEXT_SELECTOR, POLL_SELECTOR
    suggest.ts      # Ã´ soáº¡n: picker, insertEmote, tryAutoComplete, revert/restore, flush gá»­i tin
    logger.ts       # [YTCCC] console log
    inject.ts       # Ä‘á»c client info trang
  popup/
    popup.ts        # render + lÆ°u settings + 7TV GQL search
public/
  manifest.json     # MV3; matches/host_permissions: https://*.youtube.com/* + https://7tv.io/*
  emotes.json       # emote custom: [["sangroll","images/sangroll.avif"], ...]
  icons/ images/ popup/{popup.html,popup.css}
build.mjs  bump-version.ps1  dist/
```

## 3. Luá»“ng dá»¯ liá»‡u chÃ­nh
- **Settings**: popup â†’ `chrome.storage.sync` â†’ content `watchConfig` (onChanged) â†’ cáº­p nháº­t `config` + quÃ©t láº¡i (debounce 300ms).
- **Tin nháº¯n chat**: MutationObserver(trÃªn body, childList+subtree) â†’ `handleAddedNode` (badge + command + emote cho tin nháº¯n) / schedulePollEmotes (poll, debounce 150ms, bá» qua batch chá»©a artifact cá»§a mÃ¬nh) / closest(MESSAGE_SELECTOR) â†’ applyEmotes.
- **Sweep an toÃ n**: 3s má»™t láº§n (`emoteSweep`: tin nháº¯n + `#content-text` + poll + catalog) vÃ  300ms sau khi Ä‘á»•i settings. Sweep = lÆ°á»›i an toÃ n chá»‘ng trÆ°á»£t node.
- **Moderate API**: content script gá»i tháº³ng `https://www.youtube.com/youtubei/v1/live_chat/moderate?prettyPrint=false` vá»›i SAPISIDHASH (SAPISID/1P/3P Ã— origin `location.origin`), hoáº¡t Ä‘á»™ng cáº£ trÃªn studio.
- **Create poll params**: main-world injector giáº£i mÃ£ payload protobuf lá»“ng trong Studio `continuation` Ä‘á»ƒ dá»±ng `create_poll.params` ngay láº§n Ä‘áº§u; chá»‰ fallback sang params báº¯t tá»« poll thá»§ cÃ´ng/cache hoáº·c `ytInitialData` khi continuation khÃ´ng há»£p lá»‡.
- **7TV**: popup GQL `POST https://7tv.io/v3/gql` (search user) + `GET /v3/users/{id}` (láº¥y set id); content `GET /v3/emote-sets/{id}` (náº¡p emote). áº¢nh = URL CDN trá»±c tiáº¿p.

## 4. Quy táº¯c chá»‘ng Ä‘Ã²n báº©y DOM (Ráº¤T QUANTRá»ŒNG)
- KhÃ´ng bao giá» mutate DOM trong MutationObserver callback má»™t cÃ¡ch vÃ´ Ä‘iá»u kiá»‡n â€” tá»«ng gÃ¢y vÃ²ng láº·p vÃ´ háº¡n â†’ treo + RAM tÄƒng (CHANGELOG 1.0.63/64).
- Poll xá»­ lÃ½ theo **canonical check**: chá»‰ mutate khi card chÆ°a Ä‘Ãºng tráº¡ng thÃ¡i Ä‘Ã­ch (cÃ³ text raw má»›i / chuyá»ƒn ended). Batch observer chá»©a artifact cá»§a mÃ¬nh (`data-ytccc-poll`, `data-ytccc-poll-src`) bá»‹ bá» qua.
- Node text chá»©a `\u200b` bá» qua khi quÃ©t emote (chá»‘ng re-process).

## 5. Kiá»ƒm thá»­
- jsdom harness: `C:\Users\Dell\AppData\Local\Temp\opencode\ytccc-test\test.js` â€” 16 test, load `dist\content\content.js`. Pháº£i pass 16/16 trÆ°á»›c khi phÃ¡t hÃ nh.
- Kiá»ƒm thá»­ tay: load `dist/` vÃ o Chrome â†’ reload extension â†’ **F5 trang** (SPA giá»¯ content script cÅ© â€” nguyÃªn nhÃ¢n nhiá»…u khi debug).

## 6. Quy Æ°á»›c code
- TS strict; module ESM; khÃ´ng thÃªm thÆ° viá»‡n ngoÃ i (esbuild + tsc lÃ  Ä‘á»§).
- HÃ m nhá», cÃ³ comment tiáº¿ng Anh giáº£i thÃ­ch "táº¡i sao" (khÃ´ng comment vÃ´ nghÄ©a).
- Key i18n má»›i: thÃªm cáº£ `vi.ts` vÃ  `en.ts`.
- Má»i thay Ä‘á»•i: build sáº¡ch + 16/16 + bump version + ghi CHANGELOG.md.
