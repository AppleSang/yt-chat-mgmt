# yt-chat-mgmt

A Chrome extension that keeps YouTube live chat clean and brings 7TV emotes into it.

Tiếng Việt: [README.vi.md](README.vi.md)

## Features

**Chat cleanup**
- Auto-cleans messages that start with a command prefix (`!` by default): deletes them when possible, otherwise hides them silently — with a "Cleaned: …" toast.
- Auto-enables "Live chat" mode for you.
- Hides member / mod badges and chatter avatars.
- Hides bots (`@nightbot`, `@streamelements`, …) — their messages show as toasts with a clickable link instead.
- Activity log with one-click clear.

**7TV emotes**
- Renders 7TV emotes in live chat and polls: the global set plus any user sets you add.
- Adds a 7TV button (and avatars of your added users) inside YouTube's own emoji picker. The picker's search box also filters your 7TV emotes.
- Clicking an emote types its keyword into the chat box; type `|keyword` — or just the full keyword — to auto-complete into an emote.
- High-quality (4x) rendering with a safe cache: writes 30 emotes every 3 seconds, shows a progress bar with ETA, and stays on 2x until the 4x cache is ready.

**Popup panel**
- Every setting in one place, in English or Vietnamese.
- Stats card: cache size and live cache progress.

## Install (Developer mode)

1. Download or clone this repo.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `dist/` folder.
5. Open any YouTube live stream — done.

Build from source: `node build.mjs` (requires Node.js).

## Credits

- [7TV](https://7tv.app) — emote data from the public 7tv.io API, CDN images and the 7TV logo.
- [7tv-for-youtube by syocless](https://github.com/syocless/7tv-for-youtube) — the approach this project's 7TV integration follows.
- Built with TypeScript + esbuild. No runtime dependencies.

<p align="center">
  <img src="yt-chat-mgmt-banner.svg" width="640" alt="yt-chat-mgmt" />
</p>
