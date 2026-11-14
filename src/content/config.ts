import type { ExtensionConfig } from "../language/types";
import { DEFAULT_LANGUAGE, isLanguageCode, setLanguage } from "../language/i18n";
import type { LanguageCode } from "../language/types";
import { log } from "./logger";

const DEFAULTS: ExtensionConfig = {
  enabled: true,
  prefix: "!",
  autoLiveChat: true,
  hideBadges: false,
  hideAvatars: false,
  modPoll: false,
  botList: "@nightbot, @streamelements, @streamlabs",
  botToastSeconds: 10,
  emoteHq: false,
  language: DEFAULT_LANGUAGE
};

export let config: ExtensionConfig = { ...DEFAULTS };

let botNames: string[] = [];

const parseBots = (s: string | undefined): string[] =>
  String(s || "")
    .split(/[,;\n]/)
    .map((b) => b.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);

export const isBot = (author: string): boolean => {
  if (!botNames.length) return false;
  const a = String(author || "").replace(/^@/, "").toLowerCase();
  return botNames.includes(a);
};

export const loadConfig = async (): Promise<void> => {
  try {
    const stored = (await (chrome.storage.sync.get(
      DEFAULTS as unknown as Record<string, unknown>
    ) as unknown as Promise<Record<string, unknown>>)) || {};
    const lang: LanguageCode = isLanguageCode(stored.language)
      ? (stored.language as LanguageCode)
      : DEFAULT_LANGUAGE;
    config = {
      enabled: !!stored.enabled,
      prefix: String(stored.prefix || "!").slice(0, 5),
      autoLiveChat: !!stored.autoLiveChat,
      hideBadges: !!stored.hideBadges,
      hideAvatars: !!stored.hideAvatars,
      modPoll: !!stored.modPoll,
      botList: String(stored.botList || ""),
      botToastSeconds: (() => {
        const secs = Number(stored.botToastSeconds);
        return Number.isFinite(secs)
          ? Math.min(35, Math.max(0, Math.floor(secs)))
          : 10;
      })(),
      emoteHq: !!stored.emoteHq,
      language: lang
    };
    setLanguage(config.language);
    botNames = parseBots(config.botList);
    log("config loaded:", JSON.stringify(config));
  } catch (e) {
    config = { ...DEFAULTS };
  }
};

export const watchConfig = (): void => {
  if (!(chrome.storage && chrome.storage.onChanged)) return;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.enabled) config.enabled = !!changes.enabled.newValue;
    if (changes.prefix)
      config.prefix = String(changes.prefix.newValue || "!").slice(0, 5);
    if (changes.autoLiveChat) config.autoLiveChat = !!changes.autoLiveChat.newValue;
    if (changes.hideBadges) config.hideBadges = !!changes.hideBadges.newValue;
    if (changes.hideAvatars) config.hideAvatars = !!changes.hideAvatars.newValue;
    if (changes.modPoll) config.modPoll = !!changes.modPoll.newValue;
    if (changes.botList) {
      config.botList = String(changes.botList.newValue || "");
      botNames = parseBots(config.botList);
    }
    if (changes.botToastSeconds) {
      const secs = Number(changes.botToastSeconds.newValue);
      config.botToastSeconds = Number.isFinite(secs)
        ? Math.min(35, Math.max(0, Math.floor(secs)))
        : 10;
    }
    if (changes.emoteHq) config.emoteHq = !!changes.emoteHq.newValue;
    if (changes.language) setLanguage(changes.language.newValue);
    log("config updated:", JSON.stringify(config));
  });
};
