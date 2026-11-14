/**
 * Vietnamese UI strings. Must keep the same keys as `en`.
 */
import type { Dict } from "./en";

export const vi: Dict = {
  // Popup: header / cards
  popupSettingsCard: "Cài đặt",
  popupCleanupOption: "Dọn lệnh",
  popupAutoLiveChat: "Tự động “Trò chuyện trực tiếp”",
  popupHideBadges: "Ẩn badge (hội viên / mod)",
  popupHideAvatars: "Ẩn avatar người chat",
  popup7tvCard: "Cài đặt 7TV",
  popupEmoteHqWarn: "Đang chạy emoji 2x — đang cache 4x, xong sẽ tự chuyển.",
  popupModPoll: "Mod có thể tạo cuộc bầu chọn (“!poll”)",
  popupBotList: "Ẩn bot (cách nhau bằng dấu phẩy)",
  popup7tvSearch: "Thêm user 7TV",
  popupEmoteHq: "Emoji chất lượng cao (4x)",
  popupBotToast: "Hiển thị tin nhắn bot bằng thông báo",
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
  cleanedPrefix: "Đã dọn: {text}",
  modPollNotAllowed: "Chỉ mod / chủ kênh mới được tạo bình chọn",
  modPollInvalid: "Cú pháp: !poll câu hỏi // lựa chọn 1 // lựa chọn 2",
  modPollCreated: "Đã tạo cuộc bình chọn",
  modPollFailed: "Không tạo được bình chọn ({detail})"
};
