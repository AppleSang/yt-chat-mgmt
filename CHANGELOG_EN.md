# CHANGELOG — yt-chat-mgmt

Tiếng Việt: [CHANGELOG.md](CHANGELOG.md)

## 1.0.126
- **Every incoming message is hidden until the decision is made** (ends the chat jitter): a row that enters the DOM gets `data-ytccc-pending` + `display:none!important` CSS right in the MutationObserver microtask (before paint); once author + body have arrived, `processMessage` decides synchronously - bots/commands stay hidden, everything else drops the pending flag and appears. Empty shells (Polymer stamps author/message in a later task) stay pending instead of showing un-decided; a 2s fallback decides on its own if the content never lands.
- **Bot toasts render emotes + highlight the handle**: the toast body reuses the emote walker (custom + 7TV; links skipped) and the self-mention walker (`@NotRealSang` and `NotRealSang`, styled exactly like the chat chip); links inside the toast stay intact.
- **Scroll jitter fixed at the root**: pending rows are now hidden with an inline `display:none` too (independent of stylesheet timing), so an undecided row never owns layout; any row that already had layout when hidden (late decisions/legacy) collapses over 160ms ease-out instead of snapping - the scroller clamps smoothly instead of jumping a whole row in one frame; honors `prefers-reduced-motion`.
- Command hiding is still synchronous before any await (`!poll`/`deletedLog`/params wait/API run in the background); late author/message stamps are re-decided via the observer's mutation branch.
- Verified: build auto-bumped 1.0.125 → 1.0.126; harness 32/32 (new: pending uses inline display:none, late bot pending too; a new message stays pending until its content arrives, then appears; a late-filled bot is pending from the start; a bot toast renders an emote + highlights the @handle); command-hider 13/13; mention 15/15; alt-delete 37/37; popup-update 16/16; popup-hider 10/10; banner 12/12; dock 18/18; zip-parser 8/8; update-page 19/19; pollcmd/cache/picker ALL PASSED.

## 1.0.125
- **Update button temporarily hidden on the popup** - at the owner's request the `#updateAction` button sits behind `SHOW_UPDATE_ACTION = false` (in `popup.ts`); the **"New Update!!! x.y.z"** badge is unchanged and still links to the Releases page for manual zip downloads. The updater page and its whole infrastructure (F14) are untouched, only the popup entry point is missing - flip the flag to `true` to bring it back with no other changes.
- Verified: build auto-bumped 1.0.124 → 1.0.125; popup-update 16/16 (2 cases changed: the button is hidden in every state while the flag is off; the wiring still opens the updater page); update-page 19/19; harness 24/24; mention 15/15; alt-delete 37/37; popup-hider 10/10; command-hider 13/13; banner 12/12; dock 18/18; zip-parser 8/8; pollcmd/cache/picker ALL PASSED.

## 1.0.124
- **Updater page: a zip-drag install path** - Chrome unpacks a zip dragged onto `chrome://extensions` into `<profile>\User Data\...\UnpackedExtensions\<zipname>_XXXXXX`, and the File System Access API is hard-blocked (`kBlockAllChildren`) on the whole User Data / AppData\Local tree (verified in the Chromium source + a Chrome 150/2026 security study), so the folder flow can never work for that install type. The updater page now also shows a **"Download the new .zip"** link with instructions: download, open chrome://extensions, **remove the old copy**, then drag the zip onto that page. Removing the old copy is mandatory because every drag unpacks into a fresh random-suffixed folder, hence a new extension ID - dragging on top leaves two copies running side by side (verified by the user: two same-name extensions with different IDs).
- Cancelling the folder picker now reports "Folder pick was cancelled." instead of a raw `AbortError` string.
- **Pinned manifest key**: a fixed `"key"` (RSA 2048) makes every install (zip-drag or folder) use **the same extension ID forever**; previously each zip re-drag produced a new ID, orphaning settings (stored per ID in `storage.sync`). Trade-off: existing installs change ID once when moving to 1.0.124 (they had to reinstall anyway to get the new build).
- Verified: build auto-bumped 1.0.123 → 1.0.124; update-page 19/19 (8 new cases: zip link + hint shown with the right href on the new-release state, kept after a failure, hidden when up to date / asset missing, picker cancel → friendly message + retry + fallback intact); harness 24/24; mention 15/15; alt-delete 37/37; popup-update 16/16; popup-hider 10/10; command-hider 13/13; banner 12/12; dock 18/18; zip-parser 8/8; pollcmd/cache/picker ALL PASSED.

## 1.0.123
Aggregated release of everything since v1.0.102 (full details: the 1.0.122, 1.0.119 and 1.0.117 sections below):

- **Self-updater from GitHub** - an **Update** button on the popup when the badge reports a newer release downloads the latest release zip, unpacks it with a dedicated zip parser (no external library), **verifies the archive's manifest.json matches the release**, overwrites the installation folder through a File System Access handle (picked once, persisted in IndexedDB) and `chrome.runtime.reload()`s the extension. No PowerShell, no chrome://extensions visit. YouTube tabs need an F5 after the reload.
- **Self-mention highlight** - the extension detects your own handle ("Your channel" guide entry + a passive source: your own account menu on watch pages); text containing the handle gets wrapped in a chip that mimics YouTube's mention chip; two real-DOM bugs fixed: the chip is now an id-less `span.mention` and YouTube inserts a U+200B delimiter after chips.
- **Command cleanup auto-presses YouTube's confirm dialog** and the Alt icon storm is gone; the popup greets "Hello @user" when up to date.
- Verified: zip-parser 8/8, update-page 11/11, popup-update 16/16, mention-test 15/15, alt-delete 37/37, harness 24/24, popup-hider 10/10, command-hider 13/13, banner 12/12, dock 18/18, pollcmd/cache ALL PASSED.

## 1.0.122
- **Self-updater from GitHub** - an **Update** button on the popup when the badge reports a newer release opens the `update/update.html` page: it downloads the latest release zip (`yt-chat-mgmt-vX.zip`), unpacks it with a dedicated parser (`src/update/zip.ts` - EOCD + central directory, methods 0/8 via `DecompressionStream`, no external library; directory entries / `./` prefixes / zip-slip paths are dropped), **verifies the archive's `manifest.json` matches the release version**, then overwrites the installation folder through a `File System Access` handle (the user picks the folder once, persisted in IndexedDB `ytccc-updater`; `manifest.json` is written last as the completion marker) and finally `chrome.runtime.reload()`s itself. Design rationale: MV3 forbids executing fetched code and Chrome will not let an extension write into its own folder - this is the closest achievable self-update path for unpacked installs (no PowerShell, no chrome://extensions visit).
- The button **only appears when the local version is older than the release**; other states are unchanged. Any step failure shows details plus "Try again". YouTube tabs need an F5 after the reload (the new content script does not re-enter an old SPA session).
- build.mjs gained the `src/update/update.ts` entry + copies `public/update/`; the manifest gained host permissions for `github.com` + `objects.githubusercontent.com` (CORS-free asset download; the `releases/latest` API keeps using its existing CORS headers).
- Verified: build auto-bumped 1.0.121 → 1.0.122; new tests zip-parser 8/8 (store/deflate, name normalisation, zip-slip, local-vs-central extra drift, odd methods, garbage input, real Compress-Archive interop) + update-page 11/11 (ready/uptodate/dev/api-fail/retry/click-without-picker); popup-update extended to 16/16 (Update button: shown only in the "new" state, opens the right page, hidden elsewhere); harness 24/24; mention 15/15; alt-delete 37/37; popup-hider 10/10; command-hider 13/13; banner 12/12; dock 18/18; pollcmd/cache ALL PASSED.

## 1.0.119
- **Fixed "typing my name does not highlight"** - 2 root causes found by inspecting the real DOM: (1) YouTube's mention chip is now a `<span class="mention">` **with no `id="mention"` anymore** - `syncMentionStyle` found nothing so our chip fell back to the default color (pale white) instead of the real chip color (red `rgb(136,39,18)`), and the no-double-wrap guard was a no-op; the code now queries both `#mention, span.mention` and the guard matches `closest("#mention, span.mention, [data-ytccc-poll-src]")`. (2) YouTube renders a **U+200B (zero-width) delimiter right before the text that follows a mention chip** - the old `val.includes("\u200b")` guard skipped the whole node, so "NotRealSang" after a chip was never wrapped; the ZWSP guard is gone (emote artifacts live in the input field and poll spans only, both already excluded by the new guard).
- **Handle detection on watch pages**: watch pages render no guide (`ytd-guide-renderer` only exists on home/an open drawer - verified), so a main page on a watch URL could never write the handle. Added a passive source: a MutationObserver over `ytd-popup-container` - when the viewer **opens their own account menu**, the "Xem kênh của bạn" / "Your channel" link (`a[href^="/@"]`) is picked up - only links whose text matches the marker are trusted, other channels' menus are never read, no clicks on the user's behalf, and the result is stored permanently in `chrome.storage.local.ownHandle`.
- Verified: build auto-bumped 1.0.118 → 1.0.119; mention-test 12/12 (new cases: id-less `span.mention` chip + text after the ZWSP delimiter); harness 24/24; alt-delete 37/37; popup-update 12/12; popup-hider 10/10; command-hider 13/13; pollcmd/cache/banner/dock ALL PASSED. Live check: the chat iframe wraps "NotRealSang" + "@NotRealSang" and the native red chip stays untouched.

## 1.0.117
- **Removed the Alt-mode "icon storm"**: previously holding Alt nudged hover events (pointerenter/over/move) and force-stamped the registry so YouTube stamped its mod button set (delete/timeout/ban) on **every** visible row and kept them revealed. Now holding Alt only: red outline on `!` rows + a synthetic trash button **only on command rows without a native one** (creating the container too when missing). `revealInlineActions`, `forceStampNativeButtons`, the `HoverCtor` type and the `:has(#inline-action-buttons > *)` CSS rule are gone.
- **Auto-confirms YouTube's delete dialog**: pressing the native trash button (Alt+click or auto-cleanup) makes YouTube open its confirm popup; the extension clicks the confirm button (`#confirm-button`) as soon as the dialog renders (60ms poll, up to 1.2s); if the dialog is still stuck after 500ms an ESC is sent to close it (safety net).
- **Highlights your own name in chat**: the handle is auto-detected from the guide menu (the "Your channel" entry's `a[href^="/@"]`, first child of `#section-items` — main pages only; the chat iframe picks it up through `chrome.storage.local.ownHandle` + onChanged). Every text occurrence of the handle (with or without `@`) is wrapped in a `span.ytccc-self-mention` chip styled like YouTube's mention chip (background/color copied from a real `#mention` chip when present); native chips are untouched, glued text (`x@handle`) is not wrapped, and the 3s sweep is idempotent.
- **Popup says hello when up to date**: when the version equals the latest GitHub release the badge shows "Hello @user" (key `popupHelloUser`, class `update-hello`, not a link); the "new update" / "dev-build" states are unchanged; when no handle is known the badge stays hidden.
- **Fixed 2 latent bugs found while testing mentions**: (1) `el.querySelector("#message")` returns `null` in nwsapi (jsdom) when the document holds duplicate ids — every chat row has a `#message` span and the getElementById fast-path only ever returns the document-wide first match then fails containment — replaced with a manual subtree scan (`messageOf`); (2) `applyMention` used to `replaceChild` a fragment **identical** to the original node when the pattern produced no match (cheap check passed but the lookbehind rejected, e.g. `x@handle`), which re-triggered the MutationObserver forever — nodes are now only replaced on a real match (`matched` flag).
- Verified: build auto-bumped 1.0.113 → 1.0.117; mention-test 10/10 (new — @/plain wrap, native chip untouched, idempotent sweep, guide detection writes storage); popup-update 12/12 (3 new hello cases); alt-delete 37/37 (no nudge/stamper, synth on command rows only, confirm auto-click, ESC when stuck); popup-hider 10/10; command-hider 13/13; harness 24/24; pollcmd ALL PASSED; picker 47/47 + cache ALL PASSED; banner 12/12; dock 18/18.

## 1.0.113
- **Bugfix: turning the hider off left Command cleanup visible in the popup** — root cause: `.opt-pair { display: flex }` in popup.css **overrides the UA `[hidden] { display: none }` rule** (author CSS always beats the UA stylesheet), so the `hidden` property/attribute was set correctly while the `<label id="commandDeletePair">` kept rendering. Added an explicit `.opt-pair[hidden] { display: none }` guard.
- **Fixed a false-positive test**: the popup-hider test only asserted the `.hidden` property (attribute presence) instead of actual visibility — all four cases now check `getComputedStyle(...).display !== "none"`; the other assertions (checkbox state + stored `commandDelete: false`) are unchanged.
- Docs synced to the current state: REQUIREMENTS.md R1 rewritten for the two-arm config + menu-less delete flow + the forced-off rule (R1.2/R1.6/R1.7), R8.2 updated to the split row; UI_UX_GUIDELINES.md popup mock now shows "Ẩn lệnh + Dọn lệnh (one split row)".
- Verified: build auto-bumped 1.0.112 → 1.0.113; popup-hider 10/10 (computed display); popup-update 9/9; harness 24/24.

## 1.0.112
- **Command cleanup is forced OFF when the hider is off**: not just hiding the toggle — the popup writes `commandDelete: false` into storage both on load (repairs a stale state) and when the hider switch is turned off. Re-enabling the hider always starts from cleanup OFF; the delete arm must be switched back on deliberately.
- **`build.mjs` bumps the version itself**: running `node build.mjs` now patches `manifest.json` up before bundling (watch rebuilds do NOT bump). No separate `bump-version.ps1` step anymore (the ps1 file is kept as a fallback).
- Verified: build auto-bumped 1.0.111 → 1.0.112; new popup-hider test 10/10 (hider off → pair hidden + checkbox unchecked + storage false / hider on → visible + kept checked / live toggle off → both flags saved / hider back on → cleanup starts OFF); command-hider 13/13; alt 34/34; harness 24/24; picker 47/47; cache 11/11; banner 12/12; dock 18/18; badge 9/9.

## 1.0.111
- **Bye 3-dot menu — fully automatic deletion**: with Command cleanup on, a `!` row is deleted the moment it appears WITHOUT the context-menu simulation anymore (pressing ⋮ → picking "Remove"). Two delete paths remain: (1) actually pressing the native inline trash button when the server sent the mod action set (`data.inlineActionButtons`) — YouTube handles it, (2) the silent `live_chat/moderate` API call with scraped params. Missing both → hidden silently (auto flow) / red flash (Alt+click). Removed `tryMenuDelete`, `REMOVE_LABELS` and the "retry after the menu surfaced the annotation" logic.
- The two-arm split from 1.0.110 stands: Command cleanup only shows in the popup while Command hider is on — confirmed working.
- Verified: clean build; alt-delete 34/34 (the menu case became: no deletion + red flash + row untouched); command-hider 13/13; harness 24/24; picker 47/47; cache 11/11; banner 12/12; dock 18/18; badge 9/9; pollcmd ALL PASSED.

## 1.0.110
- **Split "Command cleanup" into two toggles on one popup row**: **Command hider** (base switch, old `enabled` id) and **Command cleanup** (the delete arm, sitting on the right of the same row, only visible while the hider is on). New storage key `commandDelete` (default **true** — existing installs keep the delete behavior).
- **Hider on + cleanup off = hide only**: `!` messages vanish from the chat instantly (no `live_chat/moderate` call, no menu attempts, no "Cleaned" toast, no `deletedLog` entry); rows stay tagged `data-ytccc-command` so manual Alt+click delete keeps working; `!poll` still creates the poll when modPoll is on (poll creation ≠ message deletion). Cleanup on → the exact old delete flow (params → API → menu → toast). Hider off → all hidden messages revealed as before.
- New i18n key `popupCommandHider` (vi: "Ẩn lệnh", en: "Command hider"); the popup syncs the delete arm's visibility with the base switch on load and on change.
- Verified: clean build; new command-hider test 13/13 (hide-only with zero API calls + no toast / enabling the delete arm via storage change → API + toast / hider off → reveal + new rows untouched / both arms on → deletes again); harness 24/24; picker 47/47; cache 11/11; banner 12/12; alt 32/32; dock 18/18; badge 9/9.

## 1.0.109
- **Reverse-engineered YouTube's mod-button mechanism** (read YouTube's chat bundle in-browser): the trash/timeout/ban set is stamped from **`data.inlineActionButtons`** — a payload field the server only sends to moderators on live chats; `computeHasInlineActionButtons(data)` checks that array and the stamper writes buttons into `#inline-action-buttons` via the `stampDom["data.inlineActionButtons"]` registry (registered only when the renderer's support flag is on — why the offline test stream stayed empty).
- **Alt hold gives `!` rows a delete button set**: each Alt press sweeps once — synthetic hover (pointerenter/over/move) nudges native stamping; rows carrying the payload but unstamped get the stamper registered + data replayed; rows with no payload get a **lookalike native trash button** (Material delete glyph, 32px round, i18n title) grown into `#inline-action-buttons`. Clicking the synth button or Alt+clicking the row both take a single delete path: scraped params → silent API → context menu; failure flashes the row. Releasing Alt / losing focus cleans up every synth button.
- **Alt+click prefers the native button press**: rows with the server-sent set get their native trash actually clicked → deletion through YouTube's own pipeline; synth buttons are excluded from the native-button probe so nothing clicks in circles.
- Verified: clean build; Alt-delete test 32/32 (new: native rows get no synth / payload rows receive the stamper registry / bare rows get an i18n-labeled synth / direct synth clicks don't loop / Alt release cleans up); harness 24/24; picker 47/47; cache 11/11; banner 12/12; dock 18/18; badge 9/9.

## 1.0.108
- **Alt+click auto-presses the native trash button**: holding Alt and clicking a `!` row now presses YouTube's OWN inline trash button (the round icon next to the author chip that mods/owners get on hover — trash/timeout/ban) instead of simulating the API. Deletes flow through YouTube's regular moderation pipeline, even while the button container is hidden (programmatic clicks don't need visibility). Only when YouTube never stamped the buttons (offline chat, non-mod viewer, A/B) does it fall back to the old chain: params → silent API → context menu → red flash.
- **Nudges stamping + reveals mod buttons while Alt is held**: pressing Alt sweeps synthetic pointerenter/pointerover/mousemove over rows so YouTube hover-stamps the inline action set; the Alt stylesheet gains a `:has(#inline-action-buttons > *)` rule that force-`display:inline-flex` any already-stamped set YouTube is hiding (visible without a real hover).
- Verified: clean build; Alt-delete test 22/22 (new: native button pressed + API untouched + no local hide / 3 hover events nudged on Alt down / `:has` reveal CSS); harness 24/24; picker 47/47; cache 11/11; banner 12/12; dock 18/18; badge 9/9. Live verification caveat: the test stream had already gone offline, so real stamping was not observable — use a LIVE stream as mod/owner to see the button set; deletion still works without it thanks to the fallback.

## 1.0.107
- **Alt+click narrowed to the command cleaner's arm**: only messages starting with the command prefix (`!` — from the configured `prefix`) are deleted on Alt+click; normal messages keep their native click behavior (links, menus...). This replaces the manual 3-dot → Delete dance on `!` spam (most useful while the auto cleaner is switched off). Command rows are tagged `data-ytccc-command` even when the cleaner is off, so the red Alt-hover highlight appears only on actual `!` rows.
- Verified: clean build; Alt-delete test 17/17 (new: command-only hover CSS / correct row tagging / normal message never deleted + no flash); harness 24/24; picker 47/47; cache 11/11; banner 12/12; dock 18/18; badge 9/9.

## 1.0.106
- **Pinned messages escape bot hiding**: the pinned copy of a message (the message renderer inside `yt-live-chat-banner-manager`) is now fully exempt from the moderation flow — when the channel owner pins a bot's message, the strip keeps showing it (the bot's messages in the chat list are still hidden with their toast). Command deletion (`!` prefix) and Alt+click also skip pinned copies; badges/emotes still render on the copy (display only).
- **Pinned strip above the chat column**: the Top-mode placement stylesheet adds `position:relative;z-index:2;flex-shrink:0` to `yt-live-chat-banner-manager` — the strip always paints above the chat column and can never be squeezed away by the flex column; Bottom mode stays a pure native-order mirror (nothing added).
- **Quick delete via Alt+click (mod)**: holding `Alt` outlines chat rows in red on hover with a crosshair cursor; left-clicking a row deletes that message (same precedence as the `!` cleanup: annotated params → silent `live_chat/moderate` API call, no params → open the context menu and press its Delete item, retry the API once when the menu surfaced the annotation). Success hides the row instantly; failure (not a mod / no permission) flashes a red outline for 700ms and changes nothing; pinned copies are protected, clicks outside message rows pass through untouched, and releasing Alt or losing focus exits the mode (never stuck).
- Verified: clean build; banner test 12/12 (new: pinned bot copy stays visible + list copy still hidden, z-index only in Top mode); new Alt-delete test 12/12 (API / menu fallback / failure flash / pinned protection / outside + no-Alt clicks inert / Alt release); harness 24/24; picker 47/47; cache 11/11; dock 18/18; badge 9/9.

## 1.0.105
- **Fixed the pinned-banner position (root cause)**: the 1.0.104 DOM move loses a tug-of-war with YouTube — verified live on a real stream: ~3 seconds after being moved, the platform re-parents `yt-live-chat-banner-manager` back to its native slot (the strip stayed at the bottom even when "Top" was chosen). Placement now runs purely on CSS `order` over the flex container (the inner `#contents` is `display:flex;flex-direction:column`): Top = banner between the separator and `#chat`; Bottom = the current native order, pinned explicitly so a future YouTube DOM reorder can never silently flip the setting's meaning. Zero DOM mutation means it survives every re-parent/re-render; if the stylesheet is removed, the 3s sweep rebuilds it.
- **Fixed the emoji-picker flicker (7TV)**: YouTube periodically re-renders the picker, dropping our injected nodes until the 3s sweep re-adds them — the ~400px panel taking most of the picker frame blinks hide/show on a cycle. A MutationObserver scoped to the picker now re-attaches our nodes in the SAME tick they are dropped: the panel element itself is reused (grid + loaded images survive, nothing reloads) and open/search state is preserved for the same picker element; a genuinely NEW picker element (reopened after a send) still starts in the stock state. Every re-attach path passes canonical checks, so the observer can never loop.
- **Auto-jump to 7TV at the end of the emoji list**: scrolling the native emoji list to its end auto-opens the 7TV Global panel (once per bottom-arrival; leaving the end and returning re-arms it). It never fires while the panel is already open or in search mode, and non-scrollable/not-yet-laid-out scrollers (0/0 metrics) are blocked so a hidden picker can never pick up a panel.
- Verified: clean build; banner test rewritten 11/11 (stylesheet content / computed order / DOM untouched / storage flip / idempotency / survives re-parenting / self-healing); picker 47/47 (12 new: instant re-attach / same element / state + grid preserved / fresh picker starts closed / auto-jump + re-arm + inert repeat ticks); harness 24/24; cache 11/11; dock 18/18; badge 9/9.

## 1.0.104
- **Pinned-message banner position**: a new "Pinned message position" row in the popup with Top/Bottom tiles (UI mirrors the "Toast position" row); Top is the default and means YouTube's native slot. Choosing Bottom moves the whole `yt-live-chat-banner-manager` (holding `#visible-banners`) to right after the chat column (`#chat`), before the input panel — the pinned strip shows below the message list instead of above it; individual banner renderers are never touched, so YouTube's pin/collapse/unpin lifecycle keeps working.
- Switching back to Top restores the manager to its exact original slot (recorded before the first move). When YouTube rebuilds the banner (channel switch, re-render), a debounced 150ms observer re-applies the choice; every application passes a canonical check (DOM touched only when out of place) — the observer can never loop on its own moves.
- Applied instantly when a tile is pressed (storage change); popup i18n adds `popupBannerPosition`/`popupBannerTop`/`popupBannerBottom` vi/en.
- Verified: clean build; new banner test 7/7 (top untouched / bottom after `#chat` / restored top / idempotency / rebuilt manager re-applied); harness 24/24; picker 35/35; cache 11/11; dock/preview 18/18; popup badge 9/9.

## 1.0.103
- **Update badge in the popup**: the top of the "Settings" card shows the state versus the latest GitHub release (`releases/latest` API): same version → nothing; older → pulsing yellow "New Update!!! x.y.z" linking to the releases page; newer (dev build) → static purple "dev-build" tag. The fetch runs straight from the popup (GitHub's API answers with CORS `*`, no extra host permission needed); non-semver tags or API failures leave the badge silently hidden.
- **i18n**: new keys `popupNewUpdate` (en "New Update!!!" / vi "Cập nhật mới!!!") and `popupDevBuild` ("dev-build"); switching language in the popup re-renders the badge.
- Verified: clean build; new popup badge test 9/9 (5 states: older / equal / dev / odd tag / API failure); harness 24/24; picker 35/35; cache 11/11; dock/preview 18/18.

## 1.0.102
- **`:` no longer completes extension emotes by accident**: typing `:yt` + Tab used to complete the custom emote `yt-chat-mgmt` (it shares the "yt" prefix) — the `:` is YouTube's own emoji namespace, so the bare-word Tab flow now skips tokens starting with `:` and leaves them to YouTube's native handling; bare words without a colon still complete custom emotes as before (`|` = all sources, `[` = custom, `:` = YouTube).
- **Right-click is no longer swallowed**: the mousedown handlers on the 7TV buttons (icon + avatars), the 7TV grid items and the suggest picker used to `preventDefault` for right/middle clicks too — they now only act on the **primary button** (`e.button !== 0` returns early), so the native context menu opens normally instead of being blocked.
- **Trigger-char hint**: the "7TV settings" card title in the popup gains a right-aligned note "Emote trigger: |" (i18n key `popup7tvTrigger` vi/en).
- Verified: clean build; harness 24/24 (new `:` + Tab test); picker 35/35; cache 11/11; dock/preview 18/18.

## 1.0.100
- **Toasts overlay the chat instead of pushing it**: the `#ytccc-toasts` container moved from in-flow to `position: absolute` (inside the chat document itself) — the stack no longer takes layout space, so the message list never shifts when a toast appears; the max `z-index` carried since before finally takes effect (static boxes ignore z-index). Anchoring follows the option via the `.ytccc-dock-top`/`.ytccc-dock-bottom` classes (top 8px / bottom 8px, 12px from the left, `width: fit-content` hugging the toast size); still docked inside `yt-live-chat-renderer`'s `#chat` as of 1.0.99, so it can never spill into main-page frames.
- **Empty = zero footprint**: `#ytccc-toasts:empty` hides the stack entirely (`display:none`, width/height 0, no margin).
- **Preview toast follows the configured display time**: the position-switch preview now uses `botToastSeconds` (10s default) instead of a hardcoded 4500ms.
- **`[` trigger for custom emotes (emotes.json)**: typing `[name` opens the suggest picker just like `|` does for 7TV, but with its own pool listing custom emotes only (`|` still suggests every source as before); typing the full `[yt-chat-mgmt` auto-converts to the emote (auto-space added), and Tab/Enter/arrows/picker clicks work like the `|` flow.
- **Fixed the trigger character leaking when typing a full name**: typing the full `|sangroll` used to leave the `|` inside the sent message (the `before` slice kept the offset past the trigger); both `|` and `[` are now removed cleanly on auto-complete.
- Verified: clean build; harness 23/23 (7 new tests: `[` picker / 7TV-excluded pool / auto-convert / Tab + no `|`/`[` leak); picker 35/35; cache 11/11; dock/preview 18/18 (`:empty`, dock classes, setting-driven duration).

## 1.0.99
- **Toast position option in the popup**: a "Toast position" row with two SVG-drawn tiles (toast docked at the **top** or **bottom** of the chat column) — pick exactly one; the `#ytccc-toasts` container docks inside YouTube's `#chat` (first/last child, `.ytccc-docked` class, truly in-flow instead of an overlay); when `#chat` is absent it falls back to the floating body overlay as before.
- **Preview on every switch**: changing the position instantly fires a preview toast inside the YouTube live chat — extension icon as avatar, `yt-chat-mgmt` as the name, localized body linking to GitHub (`toastPreviewBody` vi/en, URL auto-linked); manifest adds `icons/*` to `web_accessible_resources`.
- **Toasts locked inside the chat renderer**: the main Studio / watch-page frames also run the content script (and may carry their own `id="chat"`), which used to let toasts spill outside the chat (full-width overlay at the bottom of Studio, a toast covering the top of the watch chat column). The `#chat` lookup is now scoped to `yt-live-chat-app yt-live-chat-renderer`; with no chat renderer present **no toast is shown at all** (the body floating fallback is gone — the container is always in-flow inside `#chat`).
- Found + fixed the 16-test harness still pointing at the old folder's `dist` (v1.0.70) — it now tests the current bundle; added a dedicated dock/preview test (12/12). Verified: clean build, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.98
- **Renamed the `src/shared` folder to `src/language`** (all source imports + docs updated), and added a **README guide for adding your own language** (`src/language/README.md`): copy a locale, translate the values, register `LanguageCode` + `LOCALES`/`LANGUAGES`, build.
- Verified: clean build, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.97
- **"Report an issue" button in the popup footer replaces the "Language" label**: GitHub-style button (issue-opened SVG icon + text, i18n key `popupReportIssue` vi/en) — clicking opens the new-issue page at `github.com/AppleSang/yt-chat-mgmt/issues/new` (via `chrome.tabs.create`, no "tabs" permission needed). The language select stays right next to it.
- Verified: clean build, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.96
- **Bot hiding no longer depends on the cleanup switch**: the bot branch in `processMessage` moved above the `config.enabled` gate — turning off "Cleanup commands" still hides bots and shows toasts (the toast follows `botToastSeconds` alone). `!` command cleanup still follows the switch as before.
- Verified: clean build, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.95
- **Input-box emotes no longer "revert to text" on focus loss**: YouTube (and the extension's flush on outside clicks) rebuilds the input as plain text; now when you return to a field that ever held an emote (`focusin`) or paste into it (`insertFromPaste`), tokens matching a **full** keyword (7TV included) are rendered back into images. The flush on send (Enter / send button) is untouched, so outgoing messages stay plain text.
- **Hides the "-" on Ctrl+A**: the hidden keyword span (1px, transparent) got overpainted by Chrome's default selection colors as a tiny dash; moved to the `.ytccc-emote-t` class + `::selection { color:transparent; background:transparent }` → invisible even when selected, copying still works.
- Panel clicks still insert plain text as designed (the `skipRestore` flag blocks re-render during the insert); the picker test caught this collision before shipping.
- Verified: clean build, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.94
- **Fixed the bot toast truncating messages**: root cause — the toast body was `text.slice(0, 80)` in `commands.ts`, so long messages (e.g. multi-link ads) broke mid-way ("| htt"); the cap is gone — `showToast` already linkifies URLs and wraps the full text.
- **Wall-of-text guard**: `.ytccc-body` CSS adds `max-height: 40vh` + `overflow-y: auto` — normal messages are unchanged, only extremely long ones scroll instead of growing over the screen.
- Verified: clean build, harness 16/16.

## 1.0.93
- **Fixed the icon in front of "Settings" in the popup**: it pointed at `icons/icon48.png` — that file is the OLD design (red square with "!"); switched to `icons/icon128.png`, the correct dotted-red-circle + play + "mgmt" design. The manifest doesn't use icon16/48 (all mapped to icon128, so the toolbar is unaffected).
- Verified: clean build.

## 1.0.92
- **End of the console error "Unsafe attempt to load URL https://7tv.io/..."**: the 7tv.io fetch moved from the content script (the live_chat iframe's frame-origin check logged the error) to the **background service worker** (`ytccc-fetch-7tv` via `chrome.runtime.sendMessage`, `encodeURIComponent(id)`; the host permission `https://7tv.io/*` was already there). The content script only receives the returned JSON.
- **Bitwarden-style two-line tooltip**: `name` = "yt-chat-mgmt — Quản lý Live Chat YouTube", `short_name` = "yt-chat-mgmt" (small line); removed `action.default_title` so Chrome shows the name + short_name tooltip.
- **Extension icon in front of "Settings"** in the popup (img `icons/icon48.png` 16px, same card-head style as the 7TV section).
- Test mocks (picker + cache) switched to serving set data via `ytccc-fetch-7tv`; fetches are counted in the mock handler.
- Verified: clean build, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.91
- **The progress bar total = 7TV global emotes + currently added users** (matching the user's definition): cache-fill now filters by the configured sets — entries of **removed** users no longer "resurrect" via cache, don't render and don't count into the total.
- A cache holding entries of a removed set is treated as **not fresh** → fetch + writer rewrite purges it (one extra fetch right after removing a user, then it's clean).
- Boot-apply from cache also filters by the configured sets → emotes of deleted users don't show up in a new session.
- Added scenario 3 to `picker-stv-cache-test.js` (stale entry → refresh, no render, correct total purge) — the cache test is now 11/11.
- Verified: clean build, harness 16/16, jsdom picker 35/35, cache 11/11.

## 1.0.90
- **Stats: removed the "RAM (live chat tab)" row** (popup + content-script responder deleted — the popup no longer calls tabs.sendMessage).
- **Cache-work progress bar** in the Stats card: `cached / total emotes` (the writer stores `total`/`w2x`/`w4x` next to the cache), fill % per tick, hidden when no job is running.
- **ETA next to the bar**: based on the fixed write cadence (30 emotes/3s = 10/s), **including the pending 4x pass** (`(total − w2x) + pending4x`, format `Xs` / `Xp Ys`). New i18n key `popupStatEta` (vi + en), removed the `popupStatRam` key from both files.
- **Loosened the write cadence: 10 → 30 emotes / 3 seconds**.
- **Full pass resume**: the cache stores `w2x`/`w4x` counters — reloading mid pass 1 or pass 2 resumes at the right spot (the resume condition is a keyword prefix-match of the list, no longer an exact length match).
- Verified: clean build, harness 16/16, jsdom picker 35/35, cache 8/8.

## 1.0.89
- **Safe 7TV emote cache** (per the user's spec — 10 emotes per 3-second tick, 2x first then 4x):
  - **Chunked writer**: pass 1 writes 2x entries (10/tick, 3s/tick); with 4x enabled, pass 2 fills `fileHq` 10/tick until done (`done4x`). A fresh + complete cache (TTL 1h) → boot applies straight from cache, **never touching 7tv.io**; a cache missing 4x → still fetch → the writer continues (resume pass 2 when the keyword list matches, not from scratch).
  - **4x renders only when the 4x cache is done** (`emoteHqReady` gate in `emoteSrc`); once done, already-rendered srcs swap to 4x immediately. Enabling 4x mid-session with in-memory data → the writer runs pass 2 without re-fetching.
  - **Popup**: a warning under the 4x toggle — "Đang chạy emoji 2x — đang cache 4x, xong sẽ tự chuyển" (en: "Running 2x emotes — caching 4x, switches automatically when done") — shown when 4x is on but `done4x` isn't finished, disappears when the cache completes (3s poll). New i18n key `popupEmoteHqWarn` (vi+en).
  - **Stats card under Log**: cache size (reads `emoteStvCache`, formats B/KB/MB) + emote count + **live chat tab RAM** (the content script returns `performance.memory.usedJSHeapSize` via `chrome.runtime.onMessage` `ytccc-stats`), popup polls every 3s.
  - **3 safeguards against the 1.0.86-style freeze**: registering `emoteUrls` when applying the cache (the old bug — 7TV became plain text); boot-cache apply defers the pattern build + sweep to `requestIdleCallback` (timeout 1s, a generation counter so an old apply can't stomp a new one); a failed fetch → keep the cache, don't overwrite.
  - **Real bug found during testing**: the old fetch parse deduped against the current emotes list (which already contained cached entries) → an empty `added` → the writer never ran, 4x stuck forever. Switched to batch-internal dedupe + a cache∪fetch merge (fetch wins, cache fills the gaps).
  - New test `picker-stv-cache-test.js` 8/8: fresh cache skips the network / instant apply / URLs registered correctly / missing 4x stays 2x then swaps to 4x / done4x persists.
- Verified: clean build, harness 16/16, jsdom picker 35/35 + cache 8/8.

## 1.0.88
- **Separated the 7TV group in the popup**: "Add 7TV user" + "High-quality emoji (4x)" moved to their own "7TV settings" card (vi: "Cài đặt 7TV"), with the **7TV SVG logo** (same cropped paths from the picker, white fill) in front of the card title. The chat-cleanup items keep the "Settings" card.
- New i18n key `popup7tvCard` for both vi + en.
- Verified: clean build, harness 16/16, jsdom picker 35/35.

## 1.0.87
- **Reverted the 7TV emote cache (v1.0.86)** following user feedback: frozen tab / CPU + RAM spikes when the cache was on.
  - Root cause verified: the cache stored `{keyword, file, fileHq}` but **never registered the URLs into the `emoteUrls` map** — the cache-hit path returned before the fetch, so `emoteSrc()` returned `""`; luckily the message-render path has the `if (hit && src)` guard, so it only showed plain text (7TV lost its images, no empty imgs). Contributors to the freeze: the `storage.local.set` payload of thousands of emotes (clone + leveldb write inside the page's process) + a full-list pattern build and a whole-document sweep right at boot while the page was hydrating.
  - Restored `load7tvEmotes` to the direct 7tv.io fetch behavior of 1.0.85; removed the `emoteStvCache` key from the code (any leftovers in a user's storage.local just sit there, no longer read or written).
  - If we ever want to re-accelerate: register `emoteUrls` when applying the cache + defer the pattern build/sweep to `requestIdleCallback` + cache per set. Awaiting the user's decision.
- **Kept the popup state restoration (v1.0.86)**: confirmed intent — Chrome always kills the popup when closed, so the only way to "bring back the previous one" is to store the state (query + 7TV search results) and reload it when the popup opens.
- Verified: clean build, harness 16/16, jsdom picker 35/35.

## 1.0.86
- **Temporarily hid the "Mods can create polls" setting from the popup** (per request — to be reconsidered later): only the control UI was removed from popup.html + popup.ts wiring; the `modPoll` storage key and the content-script feature **stay intact** (anyone who enabled it keeps working).
- **Reopened the popup restoring its in-progress state** instead of resetting to defaults: the query + 7TV search results are saved to `storage.local` (`popupViewState`) on every search; reopening the popup shows the search box + result cards exactly as before closing; the state is cleared once the user is added.
- **7TV emote load acceleration (stale-while-revalidate)**: the parsed emote list is cached into `storage.local` (`emoteStvCache`, TTL 1h, with the set ids) — the next page open has emotes **available immediately** without waiting for 7tv.io; if the cache is older than 1h or the set ids changed, the old cache still displays while a background refresh runs, then auto-swaps; custom emotes always win keyword collisions. On a cache write failure (quota) it falls back to plain fetch.
- Verified: clean build, harness 16/16, jsdom picker 35/35.

## 1.0.85
- **Category icon row alignment**: our 40px 7TV/avatar buttons stretched the row while the YouTube button (~36px) sat lower → our icon sagged. Now we **measure the real YouTube button height** (`getBoundingClientRect` of `yt-emoji-picker-category-button-renderer`) and copy the size exactly (fallback 36 before layout); it syncs when the measured size changes. Added `align-self:center;vertical-align:middle` so our button stays on the row axis regardless of the row's alignment mode.
- **7TV icon at full size**: the original favicon has 24/128 units of transparent padding around the glyph, so the "7" logo rendered ~15px inside a 24px frame (clearly smaller than the YouTube icons). Cropped the `viewBox` to the glyph bounds (`8 24 108.148 80`) → the glyph fills the 24×24 frame like a normal icon.
- Verified: clean build, harness 16/16, jsdom picker 35/35 (36 fallback size + align-self center, viewBox crop).

## 1.0.84
- **Root-cause fix for field pollution (spam-click text corruption)**: the picker popup sits **inside** `yt-live-chat-message-input-renderer`, so the `closest("#input, #textbox, yt-live-chat-message-input-renderer")` guard treated picker elements (emoji items, the 7TV button's SVG path, the search box) as the chat field → `lastField` got hijacked → spam clicks inserted text into the item/SVG itself (text stacked on text, `data-ytccc-emote-field` stamped onto paths). Now `isInputField`/`markEmoteField`/the click listener all **exclude the picker subtree**, and clicks only update `lastField` when the target is inside a genuinely editable element.
- **Clicking an emoji inserts text without clicking the chat box first**: `getInputField` looks for a contenteditable with any attribute value inside the input renderer (instead of a rigid `[contenteditable='true']` + the global `#textbox`/`#input` that could hit the wrong element), and the fallback must be `isContentEditable`.
- **Spam clicks produce separate emotes**: each click inserts `keyword + space` (previously they glued into one blob → a single emote); the fallback append no longer wipes the old space/text, and the caret is placed after the synthetic input so the next click always appends.
- **No more "reloading" the emoji list on send/periodically**: a fresh panel (the picker gets closed/recreated after sending) boots in its original state — panel closed + search cleared, no auto reopen/refetch of the grid; the side effect of the field bug (a flush cascade over picker elements) is gone too.
- 7TV icon **hard-coded white fill** (the picker is always dark), avatars normalized to **24×24** like the icon. Verified: clean build, harness 16/16, jsdom picker 33/33 (spam click `kw kw kw `, no dirty picker DOM, a fresh panel boots closed).

## 1.0.83
- **7TV button + user avatars back into `#category-buttons`** (per request): 1.0.79 inserted the button **between** the buttons Polymer stamps (inside the dom-repeat range) — the suspected root of broken rendering; this version appends at the **end of the row** (outside the repeat range) and only re-pins when the button actually disappears → injection at a stable state, no mutations. The 40×40 button matches the row, and the icon inherits the YouTube category icon color (currentColor, hard-coded color dropped).
- **Clicking an emoji inserts TEXT into the input** instead of a hidden img: clicking an emoji in the panel/search results inserts the bare keyword as text (identical to what `flushEmoteField` leaves behind before sending — the sent message renders the emote exactly like hand-typing, with no leaked `|`); it dispatches a synthetic `input` (ignored internally) so YouTube's send model records the text.
- **The picker's search bar filters 7TV emotes**: typing in the original search box → the panel auto-opens with 7TV results (new i18n header `pickerStvSearch` + `pickerStvNoResults` for both vi/en); clearing the query closes the panel; pressing the 7TV button/avatars while searching exits search mode (clears the search box, YouTube resets its own grid).
- Removed the `stvCompanion` state; legacy `.ytccc-stv-row` companion rows are cleaned on every inject. Verified: clean build, harness 16/16, headless jsdom picker 29/29 (buttons in the row, the 3 Polymer buttons untouched, sibling panel, inserts text + no img, search open/filter/hint/close, legacy cleanup, sweep doesn't duplicate).

## 1.0.82
- **7TV icon uses the official logo**: replaced the hand-drawn smiley with the SVG from `https://7tv.app/favicon.svg` (the "7" logo, 3 original paths, viewBox 128). The fill switched to `currentColor` (dropped `black` + the favicon's dark-scheme style) so the icon follows the YouTube category icon color in every theme.
- **Removed the custom emote section in the picker** (`div.ytccc-catalog-section` at the end of the emoji picker): custom emotes are only reachable via the `|keyword` command / the extension's suggest picker — YouTube's picker is back to stock. Leftover sections from older versions are cleaned on every inject; also removed the dead `.ytccc-custom-emoji` class from the mousedown selector + the flush exception.
- Verified: clean build, harness 16/16, headless jsdom picker 25/25 (companion structure, panel, toggle, emote insert, legacy cleanup, sweep doesn't duplicate).

## 1.0.81
- **Fixed the broken picker + no scrolling**: the root cause was inserting the 7TV button/avatars **into** `#category-buttons` — Polymer manages every child of that row (dom-repeat), so foreign elements break rendering (icons turn into text, tooltips leak the whole row) and sections inserted in the emoji list jam scrolling.
- **New Polymer-safe structure**: the 7TV button + avatars live in their own **adjacent row** (a sibling right below `#category-buttons`, centered like the original row — Polymer-managed children untouched); the emoji panel is a sibling with its **own scroll container** (`max-height:280px;overflow-y:auto`) so scrolling no longer depends on YouTube's internal list.
- **The 7TV icon switched to an SVG** (rounded-square smiley, `currentColor`) matching the style of the other category icons instead of the "7TV" text badge.
- The panel is **closed by default**: click the 7TV icon/avatars to open (click again to toggle closed); clicking a YouTube category closes the panel so the picker behaves like stock. Old-version artifacts (a button in the Polymer row, a section in the grid) are cleaned on every inject.
- Verified headless jsdom 25/25: the companion row is a sibling, the Polymer row is untouched, SVG icon, panel hidden by default, open/close/switch Global↔user, highlight, emote insert, legacy cleanup, panel clicks don't flush the input content, sweep doesn't duplicate.

## 1.0.80
- **Fixed the 7TV button missing in the picker**: YouTube's real picker is `yt-emoji-picker-renderer` with the `#category-buttons` row (not `yt-live-chat-emoji-picker-renderer`/`tp-yt-...`) → `findPicker` found nothing so nothing was injected. Added the real tag to `findPicker`, prefer `#category-buttons` in `findCategoryRow`, and resolve the container via the parent of `yt-emoji-picker-category-renderer`.
- The observer (index.ts) now recognizes all 3 picker tag variants so injection runs the moment the picker opens, without waiting for the 3s sweep.

## 1.0.79
- **7TV integration into YouTube's emoji picker**: the category icon row gains a **7TV button** between the member (★) and YouTube (▶) icons — clicking it shows the **7TV Global** emoji list; at the **end of the row** sit the **avatars of the 7TV users added in the popup** — clicking one shows exactly **their emoji set**.
- `Emote` gains `setId` (global / user set id) to separate the global list from each user's; the panel grid sits at the end of the picker, clicking an emoji inserts it into the input like a custom emote; the active button is highlighted.
- `emoteUsers` is loaded from storage into the content script (auto-refreshes when the popup adds/removes a user); buttons re-pin themselves when Polymer re-renders (signature check, no duplicates).
- Verified headless jsdom 15/15: button position, end-of-row avatars, global/user-set panel, click switches source, highlight, emote insert, sweep doesn't duplicate.

## 1.0.78
- **Fixed poll options with emotes flickering**: the root cause was a childList tug-of-war — the extension inserts `img` + wraps text into a hidden span, YouTube's Polymer re-renders the label (overwrites the text / replaces the subtree) → text leaks out → the sweep converts it again, over and over (raw → emote → blank).
- **New CSS-static strategy**: the label's parent is marked with `data-ytccc-emote` + the CSS var `--ytccc-emote`; Polymer is free to overwrite the text (it stays hidden by `color/font-size`), the emote is drawn via `::before` from the var. Zero childList mutations from the extension → the observer (childList-only) never reacts to us, and YouTube's replace-all or duplicate-text appends don't change the look either.
- When the label parent carries extra content (not just the keyword) → falls back to the old hidden img+span path; a finished poll removes the mark + restores the text; toggling "High-quality emoji" also refreshes the var of marked labels.
- Verified headless jsdom 12/12: exactly 3 labels marked, no imgs, no growth across sweep/update-in-place/replace-all/duplicate-append, ended polls strip marks + text shows again, engagement keeps the old path.

## 1.0.77
- **Fixed toast/log links broken because YouTube truncates labels**: long links in live chat get their text shortened to `...` by YouTube (e.g. `https://www.facebook.com/groups/94833...`) with the real URL packed into a `href` of the form `/redirect?...&q=<url-encoded>`. `getMessageText` now decodes the `q` param to recover the original URL (dropping YouTube's redirect wrapper); non-redirect anchors keep their visible label.
- Text is extracted from a clone of `#message` with anchors replaced by the real URL text — the live DOM is untouched (safe for Polymer/observer/the emote pipeline).
- Applied to every `getMessageText` consumer: the bot toast, the "Cleaned" toast, the deleted-message log.

## 1.0.76
- **New "High-quality emoji (4x)" option** under "Add 7TV user" in the popup: on → every 7TV emote renders from the `4x.webp` variant, off → `2x.webp` (default, the old behavior). Custom emotes (emotes.json) have no variants so they're unaffected.
- `build7tvUrl` returns both the low (`2x.webp`, old priority order) and high (`4x.webp`) URLs at set load; `emoteSrc` picks per the `emoteHq` flag (storage.sync).
- Emotes already rendered as `<img>` can't be rebuilt from text (the text was replaced), so toggling the switch swaps the `src` of imgs matching the old URL directly — the observer only watches childList so there's no mutation loop.

## 1.0.75
- **Fixed create_poll failing with "Origin doesn't match Host"**: `createPollViaApi` (and `deleteViaApi`) now set `x-origin` to the API endpoint's origin (`https://www.youtube.com`) instead of `location.host` (avoids a mismatch when the content script runs on studio).

## 1.0.73
- **Fixed Tab emote auto-complete (`:app` / bare word)**: `tabComplete` now accepts both the `|` prefix and bare keywords (including `:`-prefixed ones like `:app`) → pressing Tab converts it into the matching emote (e.g. `:app` → `apple`); leading text kept, no space added (R5.2).
- **Fixed Tab being swallowed on `@` mentions**: the Tab keydown only preventDefault/stopPropagation when an emote is actually completed; otherwise the default runs so YouTube's own mention autocomplete (`@channel`) works.

## 1.0.72
- **Fixed copying emotes in the input**: the clipboard now holds a single keyword and a plain space after the emote (e.g. `longaodance `), no more duplicated names from the browser serializing both `img.alt` and the hidden source span.

## 1.0.71
- **`!poll` works on first use on Studio**: `inject.ts` decodes the protobuf payload in the `continuation` URL to build the right `create_poll.params`, so manually creating a poll once to warm up is no longer required.
- **Root cause**: Studio already carries the channel/live-video context in the continuation, but the old code only waited to capture a create_poll request, so params were always missing in a session that never created a poll.
- Request-capture, the cache and the `ytInitialData` deep-scan remain as fallbacks in case YouTube changes the continuation format or the page data has no valid payload.

## 1.0.70
- **`!poll` doesn't need a warm-up every session**: the params/context captured from a manually created poll are **cached in `chrome.storage.local`** (`pollParams`, `pollContext`) and seeded into the dataset at boot — create a poll manually **once**, and `!poll` works in every later session.
- `inject.ts` also captures bodies inside the **Request object** (clone + text), not just `init.body`.
- The `!poll` error toast now states the **exact reason** (missing params / HTTP status / network error) instead of a generic message.

## 1.0.69
- **Fixed `!poll` falsely reporting "not a mod/owner"**: `getRole` now reads `author-type` on the message renderer itself / `#author-name` (YouTube's standard role markers: owner/moderator/member), plus fallback layers: badges with a `type="owner|moderator"` attribute (even outside `#author-badges`), the `data-ytccc-role` annotation, and finally the localized tooltip/aria-label ("Chủ sở hữu"/"Owner"/"Quản trị viên"...).
- Added `waitForRole`: waits up to 2s for inject.ts (main world) to annotate the role before concluding "viewer", avoiding a race on freshly-arrived messages.
- A precise badge `type` in the DOM now **wins** over the raw annotation — an owner mis-annotated as "member" can still create polls.
- `getMessageText`/author lookup use `qsOne` (querySelector + a querySelectorAll fallback) — defends against nwsapi's id-fast-path (jsdom).

## 1.0.68
- **New feature — mod-created polls (`!poll`)**: the "Mods can create polls" toggle in the popup (`modPoll`, off by default). A mod/owner types `!poll "question" "option 1" "option 2" ...` (double quotes, at least 3 fields) → the **owner's** extension creates the poll via youtubei `live_chat/create_poll` (SAPISIDHASH like moderate). `inject.ts` (main world) hooks fetch/XHR to capture `params` + `context.client` from the owner's manual poll creation (fallback: a deep `ytInitialData` scan); missing params → an instructional toast; wrong role/missing fields → an error toast. `!poll` messages are still cleaned like regular commands.
- **Root-cause fix for poll emotes duplicating every second**: the target loop lacked the step that skips text nodes already hidden in `span[data-ytccc-poll-src]` → every pass converted the already-hidden node AGAIN, nesting img/span endlessly (the cause of the RAM growth). Conversion now only targets raw text nodes.
- **Polls moved to a binding-safe strategy**: Polymer's text node is kept (wrapped in a hidden span — Polymer updates `node.data` in place, no extra raw text emitted) instead of deleting/re-rendering; duplicate raw text YouTube appends next to an existing pair is dropped (dedup, even when the raw lands between img and span).
- **Fixed emotes not showing in finished polls**: `applyEmotes` receiving the `#message` element directly (the engagement path) was skipped — now handled; added `#message` (engagement) to the 3s sweep + a full re-scan when emotes finish loading (`ytccc-emotes-loaded`).
- New tests: poll harness jsdom 8/8 (single conversion, no growth on Polymer update-in-place/replace-all/duplicate-append/raw-between-pair, ended polls return plain text, engagement only emotes the title) + the `!poll` harness 7/7 (question/options/params parsing, blocks bad syntax/role).

## 1.0.67
- Poll summary card (`yt-live-chat-viewer-engagement-message-renderer`): **only the question title line** (span `style-target="bold"`) gets emote rendering — the answer lines ("label (0%)") and the "finished" line stay plain text (the regular `#message` path used to emote the options too).

## 1.0.66
- **Stable poll emote rendering**: `applyPollEmotes` rewritten as a state machine — the DOM is only mutated when the card is **not canonical** (fresh raw text re-added by YouTube, or the poll moved to ended) → a mutation-observer loop is impossible (the cause of the 1.0.63/64 freeze + RAM growth).
- Poll restoration no longer depends on adjacency: removes every `img[data-ytccc-poll]` + replaces every `span[data-ytccc-poll-src]` with the original text.
- Also cleans up "orphan" emote imgs left by the old content script (recognized by matching alt/title keywords).
- The observer reprocesses polls via a **150ms debounce** (raw text YouTube re-adds every ~1s is converted into emotes quickly), skipping batches that contain our own artifacts.
- Wrote the docs set: DESIGN_SYSTEM.md, UI_UX_GUIDELINES.md, REQUIREMENTS.md, FEATURES.md, ARCHITECTURE.md, DATABASE.md, AGENTS.md, CHANGELOG.md.

## 1.0.65
- The poll sweep removes every emote img in the card (including unmarked imgs from the old script) then redraws exactly once.

## 1.0.64
- Poll handling removed from the MutationObserver (3s sweep only) — fixes the infinite loop freezing the page + RAM growth (chrome.exe 1.5GB+).
- `applyPollEmotes` doesn't mutate when there's nothing to do.

## 1.0.63
- Polls: idempotent handling — each pass removes old emotes before redrawing; ended polls (text like "label (0%)") return plain text.
- Poll emotes keep the original text in a hidden `span[data-ytccc-poll-src]` + `img[data-ytccc-poll]`.

## 1.0.62
- Renders emotes in poll chat cards (`yt-live-chat-text-poll-renderer`, `yt-live-chat-poll-renderer`) — question + options.

## 1.0.61
- Flush on submit: the extension now **tracks fields that ever held emotes** (a Set of direct references, works in shadow DOM too — the poll composer) + clicks outside the field (the submit button...) flush every tracked field back to raw text + re-dispatch input. Picker/catalog clicks or clicks inside the field don't flush.

## 1.0.60
- Generalized flush on submit-button clicks (walks up the ancestor tree looking for a field with emotes).

## 1.0.59
- Fixed empty outgoing messages ("Your comment is too short"): the flush runs at **window-capture** (earlier than YouTube's listener) + re-dispatches `InputEvent("input")` after flushing so YouTube's model updates from the clean DOM.
- Verified with headless Chrome: `innerText` still includes hidden text → the problem is YouTube's input-event model.

## 1.0.58
- Flush hooks on send: Enter / beforeinput (insertLineBreak|insertParagraph) / a `#send-button` click — emotes flush back to their original text before YouTube reads the field.

## 1.0.57
- Fixed revert-on-extend: typed text merges into the restored node with **all `\u200b` removed** → outgoing messages no longer render as patchy `[emote]m`.

## 1.0.56
- The caret lands after the typed text when reverting an emote (node merge + caret math).

## 1.0.55
- Typing letters onto an emote auto-reverts it to text; a single Backspace removes the emote back to text.

## 1.0.54
- Wired `revertExtendedEmote` into `onFieldInput` + the Backspace branch of the keydown capture.

## 1.0.53
- A 1px transparent hidden span (replacing font-size:0 which broke sending); `insertEmote` uses a DOM range; bare names don't auto-add a space; `buildEmoteFrag(kw, addSpace)`.

## 1.0.35 – 1.0.52 (summary)
- 1.0.35: freeze fix (emote re-process loop + `\u200b` skip + Set fast-check).
- 1.0.36: 7TV removed (temporarily). 1.0.37: switched to TypeScript. 1.0.38: studio support.
- 1.0.39–41: curtain avatar = extension icon.
- 1.0.42: dropped the old footer/keepText, language moved to the footer, the curtain follows autoLiveChat only, disabling cleanup reveals hidden messages.
- 1.0.43: auto-live-chat split from the cleanup toggle; "Clean commands" became a checkbox; curtain icon128 squared; added `hideAvatars`.
- 1.0.44: the language selector is a real footer; owner `!` messages are processed too; changing settings → re-scan visible messages; the manifest merged the pattern `https://*.youtube.com/*`.
- 1.0.45: dropped the includeMods option; always attempts delete + fails silently; params retry after opening the menu; the bot list gained `@streamlabs`; the build tolerates a locked dist.
- 1.0.46: 7TV returns (direct CDN), emotes in comments/community posts (`#content-text`), 7tv.io host permission.
- 1.0.47–49: 7TV user search in the popup (GQL), +/− buttons, a list of added users, unified input style.
- 1.0.50–52: a bot toast slider 0–35s (0 = "Off"), the input is cleared after adding a user, hidden span font-size:0 (broken — fixed in 1.0.53).
