/**
 * Vietnamese UI strings. Must keep the same keys as `en`.
 */
import type { Dict } from "./en";

export const vi: Dict = {
  // Popup: header / cards
  popupSettingsCard: "Cài đặt",
  popupCleanupOption: "Dọn lệnh",
  popupCommandHider: "Ẩn lệnh",
  popupAutoLiveChat: "Tự động “Trò chuyện trực tiếp”",
  popupHideBadges: "Ẩn badge (hội viên / mod)",
  popupHideAvatars: "Ẩn avatar người chat",
  popup7tvCard: "Cài đặt 7TV",
  popup7tvTrigger: "Ký tự gọi emoji: |",
  popupNewUpdate: "Cập nhật mới!!!",
  popupDevBuild: "dev-build",
  popupEmoteHqWarn: "Đang chạy emoji 2x — đang cache 4x, xong sẽ tự chuyển.",
  popupModPoll: "Mod có thể tạo cuộc bầu chọn (“!poll”)",
  popupBotList: "Ẩn bot (cách nhau bằng dấu phẩy)",
  popup7tvSearch: "Thêm user 7TV",
  popupEmoteHq: "Emoji chất lượng cao (4x)",
  popupBotToast: "Hiển thị tin nhắn bot bằng thông báo",
  popupToastPosition: "Vị trí toast",
  popupToastTop: "Trên",
  popupToastBottom: "Dưới",
  popupBannerPosition: "Vị trí tin nhắn ghim",
  popupBannerTop: "Trên",
  popupBannerBottom: "Dưới",
  popupOff: "Tắt",
  popupLogCard: "Nhật ký",
  popupClear: "Xoá",
  popupNoData: "Chưa có dữ liệu",
  popupLanguage: "Ngôn ngữ",
  popupReportIssue: "Báo lỗi",
  popupStatsCard: "Thống kê",
  popupStatCache: "Dung lượng cache",
  popupStatEta: "còn khoảng {s}",
  popupStatEmotes: "emote",

  // Roles
  roleOwner: "Chủ kênh",
  roleModerator: "Mod",
  roleMember: "Member",
  roleViewer: "Viewer",

  // Content script
  pickerStvGlobal: "7TV Global",
  pickerStvSearch: "Kết quả tìm kiếm",
  pickerStvNoResults: "Không có kết quả",
  unknownAuthor: "Không rõ",
  botMessagePlaceholder: "(tin nhắn bot)",
  toastPreviewBody: "Extension này có mặt trên GitHub: https://github.com/AppleSang/yt-chat-mgmt",
  cleanedPrefix: "Đã dọn: {text}",
  altTrashTitle: "Xoá tin nhắn lệnh",
  modPollNotAllowed: "Chỉ mod / chủ kênh mới được tạo bình chọn",
  modPollInvalid: "Cú pháp: !poll câu hỏi // lựa chọn 1 // lựa chọn 2",
  modPollCreated: "Đã tạo cuộc bình chọn",
  modPollFailed: "Không tạo được bình chọn ({detail})"
};
