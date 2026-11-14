/**
 * Types for yt-chat-mgmt.
 */

export interface ExtensionConfig {
  enabled: boolean;
  prefix: string;
  autoLiveChat: boolean;
  hideBadges: boolean;
  hideAvatars: boolean;
  modPoll: boolean;
  botList: string;
  botToastSeconds: number;
  emoteHq: boolean;
  language: LanguageCode;
}

export type ChatRole = "owner" | "moderator" | "member" | "viewer";

export interface ToastOptions {
  title: string;
  body: string;
  avatar?: string | null;
  role?: ChatRole;
  duration?: number;
}

export interface DeletedLogEntry {
  author: string;
  text: string;
  at: number;
  role: ChatRole;
  avatar?: string | null;
}

export type LanguageCode = "en" | "vi";

/** Messages sent to the background service worker. */
export type BgRequest =
  | { type: "ytccc-get-resource"; path: string }
  | { type: "ytccc-fetch-7tv"; id: string }
  | { type: "ytccc-request-check" };

export interface BgResourceResponse {
  ok: boolean;
  text?: string;
  dataUrl?: string;
  error?: string;
}

export interface Emote {
  keyword: string;
  file: string;
  /** Optional higher-resolution CDN variant (7TV "4x"); empty for custom emotes. */
  fileHq?: string;
  /** 7TV emote-set this keyword came from ("global" or a user set id). */
  setId?: string;
  source?: string;
}

export interface SwitchStatus {
  state: "switching" | "done" | "failed" | "off" | "unknown";
  at: number;
}
