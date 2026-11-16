import type { ExtensionConfig } from "../language/types";
import { DEFAULT_LANGUAGE, isLanguageCode, setLanguage } from "../language/i18n";
import type { LanguageCode } from "../language/types";
import { log } from "./logger";

const DEFAULTS: ExtensionConfig = {
  enabled: true,
  // Deleting stays the default for existing installs; the popup exposes it
  // as the "Command cleanup" toggle next to the "Command hider" base.
  commandDelete: true,
  prefix: "!",
  autoLiveChat: true,
  hideBadges: false,
  hideAvatars: false,
  modPoll: false,
  botList: "@nightbot, @streamelements, @streamlabs",
  botToastSeconds: 10,
  toastPosition: "bottom",
  bannerPosition: "top",
  emoteHq: false,
  language: DEFAULT_LANGUAGE
};

export let config: ExtensionConfig = { ...DEFAULTS };

// Position changes come from a single popup toggle, so a plain listener
// array is enough and keeps config from importing the toast module.
type ToastPositionListener = (pos: ExtensionConfig["toastPosition"]) => void;
const toastPositionListeners: ToastPositionListener[] = [];

export const onToastPositionChange = (fn: ToastPositionListener): void => {
  toastPositionListeners.push(fn);
};

// Same single-listener pattern as the toast position: the banner placement
// module registers once and reacts to popup toggles.
type BannerPositionListener = (pos: ExtensionConfig["bannerPosition"]) => void;
const bannerPositionListeners: BannerPositionListener[] = [];

export const onBannerPositionChange = (fn: BannerPositionListener): void => {
  bannerPositionListeners.push(fn);
};

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
      commandDelete: !!stored.commandDelete,
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
      toastPosition: stored.toastPosition === "top" ? "top" : "bottom",
      bannerPosition: stored.bannerPosition === "bottom" ? "bottom" : "top",
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
    if (changes.commandDelete) config.commandDelete = !!changes.commandDelete.newValue;
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
    if (changes.toastPosition) {
      config.toastPosition =
        changes.toastPosition.newValue === "top" ? "top" : "bottom";
      for (const fn of toastPositionListeners) fn(config.toastPosition);
    }
    if (changes.bannerPosition) {
      config.bannerPosition =
        changes.bannerPosition.newValue === "bottom" ? "bottom" : "top";
      for (const fn of bannerPositionListeners) fn(config.bannerPosition);
    }
    if (changes.language) setLanguage(changes.language.newValue);
    log("config updated:", JSON.stringify(config));
  });
};
