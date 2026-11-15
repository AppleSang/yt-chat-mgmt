# yt-chat-mgmt

A Chrome extension that keeps YouTube live chat clean and brings 7TV emotes into it.

Tiếng Việt: [README.vi.md](README.vi.md)

## Features

**Chat cleanup**
- Auto-cleans messages that start with a command prefix `!`: deletes them when you're a moderator of that chat, otherwise hides them silently.
- Auto-enables the "Live chat" mode for you.
- Hides member / mod badges and chatter avatars.
- Hides bots (`@nightbot`, `@streamelements`, …) — their messages show up as toasts.
- Keeps a log of the chat when you use commands — so you have the details whenever you need them.

**7TV emotes**
- Use 7TV emotes directly in the live chat.
- Your 7TV emote list is integrated into YouTube's built-in emoji picker, and the picker's search box works with 7TV emotes too.
- To call an emote, type its keyword in the chat box: type `|emote7tv` — or the full keyword — and it turns into the emote automatically.
- Renders 7TV emotes in high quality.

## 📥 Install 📥

1. Download the extension [here](https://github.com/AppleSang/yt-chat-mgmt/releases) | grab the .zip file (not the source code).
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Drag & drop the extension zip file into the browser. Done!

## Credits

- [7TV](https://7tv.app) — emote data from the public 7tv.io API, CDN images and the 7TV logo.
- [7tv-for-youtube by syocless](https://github.com/syocless/7tv-for-youtube) — the approach this project's 7TV integration is based on.
- Built with TypeScript + esbuild. No runtime dependencies (zero dependency).

<p align="center">
  <img src="yt-chat-mgmt-banner.svg" alt="yt-chat-mgmt" />
</p>
