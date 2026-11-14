# Adding your own language

Locales live in `src/language/locales/` as plain TypeScript dictionaries.
English (`en.ts`) is the fallback — every key must exist in it.

## Steps

1. Copy `locales/en.ts` to `locales/<code>.ts` (e.g. `fr.ts`).
2. Translate the values only. Do not rename keys.
3. Register the code in `src/language/types.ts`: add it to the `LanguageCode` union.
4. Register the locale in `src/language/i18n.ts`:
   - import your dict and add it to `LOCALES`
   - add a display label to `LANGUAGES`
5. Run `node build.mjs` — the typecheck fails on missing keys, so nothing ships half-translated.

## Rules

- Keys are shared across all languages — never rename or remove them.
- `{var}` placeholders are filled at runtime — keep them intact.
- The popup language select fills automatically from `LANGUAGES`.
- Product names (7TV, YouTube...) stay as-is; translate everything else naturally.

---

<p align="center">
  <img src="../../yt-chat-mgmt-banner.svg" alt="yt-chat-mgmt" />
</p>
