# UI_UX_GUIDELINES â€” yt-chat-mgmt

Ãp dá»¥ng cho popup (`public/popup/`) vÃ  cÃ¡c UI inject vÃ o trang (curtain, toast, picker). BÃ¡m theo `DESIGN_SYSTEM.md`.

## 1. Layout tá»•ng thá»ƒ (popup)
```
+-----------------------------+
| #main (scroll dá»c)          |  <- vÃ¹ng cÃ i Ä‘áº·t, 1 cá»™t
|   card "CÃ i Ä‘áº·t"            |
|     - Dá»n lá»‡nh (checkbox)   |
|     - Tá»± chuyá»ƒn Live chat   |
|     - áº¨n huy hiá»‡u           |
|     - áº¨n avatar             |
|     - Danh sÃ¡ch bot         |
|     - Toast bot (slider)    |
|   card "7TV"                |
|     - Ã´ tÃ¬m kiáº¿m user       |
|     - káº¿t quáº£ (+)           |
|     - Ä‘Ã£ thÃªm (âˆ’)           |
|   card "Nháº­t kÃ½"            |
|     - head + nÃºt XoÃ¡        |
|     - #logList              |
| footer.lang-footer (46px)   |  <- label "NgÃ´n ngá»¯" + select
+-----------------------------+
```
- Popup KHÃ”NG cÃ³ header bar (Ä‘Ã£ bá» brand/revision).
- `#frame`: grid `1fr auto` â€” `#main` cuá»™n, footer cá»‘ Ä‘á»‹nh Ä‘Ã¡y.
- Thá»© tá»± card: CÃ i Ä‘áº·t â†’ 7TV â†’ Nháº­t kÃ½. KhÃ´ng Ä‘á»•i tráº­t tá»± khi khÃ´ng cÃ³ yÃªu cáº§u.

## 2. Vá»‹ trÃ­ nÃºt & tÆ°Æ¡ng tÃ¡c
- **NÃºt phá»¥ (XoÃ¡ log)**: trong card-head bÃªn pháº£i, kiá»ƒu `.btn.btn-secondary` (border hairline, radius 8px).
- **NÃºt + (thÃªm user 7TV)**: bÃªn pháº£i má»—i káº¿t quáº£ tÃ¬m kiáº¿m, 26Ã—26 trÃ²n; sau khi thÃªm â†’ xoÃ¡ káº¿t quáº£ + Ã´ tÃ¬m kiáº¿m.
- **NÃºt âˆ’ (gá»¡ user 7TV)**: bÃªn pháº£i má»—i user Ä‘Ã£ thÃªm, 26Ã—26 trÃ²n; hover `#ff5c5c`.
- **Slider toast bot**: náº±m dÆ°á»›i label `popupBotToast`, kÃ¨m giÃ¡ trá»‹ hiá»‡n táº¡i (`botToastVal`); 0 hiá»ƒn thá»‹ chá»¯ "Táº¯t"/"Off" (`popupOff`).
- NÃºt báº¥m luÃ´n cÃ³ tráº¡ng thÃ¡i hover rÃµ rÃ ng (Ä‘á»•i ná»n/border 120ms) vÃ  `cursor: pointer`.

## 3. Sidebar / Modal
- KhÃ´ng dÃ¹ng sidebar trong popup.
- **Curtain (tá»± chuyá»ƒn Live chat)**: overlay full chat (`curtain.ts`), icon = icon128 cá»§a extension **khÃ´ng bo gÃ³c** (vuÃ´ng, `object-fit: contain`), khÃ´ng cÃ³ text trang trÃ­. Äiá»u kiá»‡n cháº¡y chá»‰ phá»¥ thuá»™c `autoLiveChat`.
- **Toast**: gÃ³c trÃªn vÃ¹ng chat, avatar trÃ²n + tÃªn + role-tag + text; thá»i gian sá»‘ng do `botToastSeconds` (0â€“35s, 0 = khÃ´ng hiá»‡n).
- KhÃ´ng táº¡o modal má»›i náº¿u khÃ´ng Ä‘Æ°á»£c yÃªu cáº§u.

## 4. Animation
- Chuáº©n: 120â€“140ms ease cho mÃ u/knob (xem DESIGN_SYSTEM.md Â§6).
- Toast: xuáº¥t hiá»‡n báº±ng fade ngáº¯n, tá»± biáº¿n máº¥t; KHÃ”NG bounce/elastic.
- Curtain: tráº¡ng thÃ¡i "switching" cÃ³ vÃ²ng quay/icÃ´n chá», káº¿t thÃºc fade-out.
- KhÃ´ng thÃªm animation cho card/row (chá»‰ transition mÃ u hover).

## 5. NgÃ´n ngá»¯ hiá»ƒn thá»‹
- ToÃ n bá»™ label popup qua i18n (`src/language/locales/{vi,en}.ts`), key má»›i pháº£i thÃªm cho Cáº¢ 2 ngÃ´n ngá»¯.
- Khi thÃªm UI má»›i: dÃ¹ng key `popup*` má»›i, khÃ´ng hardcode tiáº¿ng Viá»‡t/Anh.

## 6. Cáº¥m
- KhÃ´ng Ä‘á»•i kÃ­ch thÆ°á»›c popup, khÃ´ng thÃªm header/quáº£ng cÃ¡o.
- KhÃ´ng Ä‘á»•i mÃ u primary (`#5e6ad2`) hoáº·c ná»n canvas.
- KhÃ´ng dÃ¹ng alert/confirm cá»§a trÃ¬nh duyá»‡t.
