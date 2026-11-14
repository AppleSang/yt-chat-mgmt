/**
 * English (default) UI strings.
 */
export const en = {
  // Popup: header / cards
  popupSettingsCard: "Settings",
  popupCleanupOption: "Command cleanup",
  popupAutoLiveChat: "Auto-enable “Live chat” mode",
  popupHideBadges: "Hide badges (member / mod)",
  popupHideAvatars: "Hide chatter avatars",
  popup7tvCard: "7TV settings",
  popupEmoteHqWarn: "Running 2x emoji — caching 4x, switches automatically when done.",
  popupModPoll: "Mods can create polls (\"!poll\")",
  popupBotList: "Hide bots (comma separated)",
  popup7tvSearch: "Add 7TV user",
  popupEmoteHq: "High-quality emoji (4x)",
  popupBotToast: "Show bot messages as toasts",
  popupOff: "Off",
  popupLogCard: "Log",
  popupClear: "Clear",
  popupNoData: "No data yet",
  popupLanguage: "Language",
  popupReportIssue: "Report an issue",
  popupStatsCard: "Stats",
  popupStatCache: "Cache size",
  popupStatEta: "about {s} left",
  popupStatEmotes: "emotes",

  // Roles
  roleOwner: "Owner",
  roleModerator: "Mod",
  roleMember: "Member",
  roleViewer: "Viewer",

  // Content script
  pickerStvGlobal: "7TV Global",
  pickerStvSearch: "Search results",
  pickerStvNoResults: "No results",
  unknownAuthor: "Unknown",
  botMessagePlaceholder: "(bot message)",
  cleanedPrefix: "Cleaned: {text}",
  modPollNotAllowed: "Only mods / the channel owner can create polls",
  modPollInvalid: "Syntax: !poll question // option 1 // option 2",
  modPollCreated: "Poll created",
  modPollFailed: "Could not create poll ({detail})"
};

export type Dict = typeof en;
