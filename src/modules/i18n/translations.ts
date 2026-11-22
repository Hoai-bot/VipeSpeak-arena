// src/modules/i18n/translations.ts
export type AppLang = 'vi' | 'en';

export const ARENA_TRANSLATIONS: Record<AppLang, Record<string, string>> = {
  vi: {
    brand_title: 'VIPESPEAK ARENA • ĐẤU TRƯỜNG NÓI TIẾNG ANH AI',
    nav_hub: '🏟️ Sảnh Giải Đấu',
    nav_cefr_test: '🎓 Kiểm Tra CEFR',
    nav_profile: '👤 Hồ Sơ & Lịch Sử',
    nav_organizer: '💼 Đơn Vị Tổ Chức',
    hero_badge: 'NỀN TẢNG THI ĐẤU & ĐÁNH GIÁ NĂNG LỰC NÓI CHUẨN QUỐC TẾ',
    hero_title: 'CHINH PHỤC ĐỈNH CAO GIAO TIẾP & TRANH BIỆN TIẾNG ANH',
    hero_subtitle: 'Thi đấu Solo, Tiếp sức Relay, Nhập vai Roleplay & Tranh biện Debate 1v1 cùng giám khảo AI thời gian thực.',
    btn_join_now: '🚀 THAM GIA THI ĐẤU NGAY',
    btn_cefr_placement: '📊 ĐO TRÌNH ĐỘ CEFR (A1–C2)',
    filter_all: 'Tất cả',
    filter_online: '🌐 Online (Từ xa)',
    filter_offline: '🏟️ Offline (Tại chỗ)',
    mode_solo: '🥊 Solo (Cá nhân)',
    mode_relay: '🏃 Relay (Tiếp sức 2 người)',
    mode_roleplay: '🎭 Roleplay (Nhập vai)',
    mode_debate: '⚖️ Debate (Tranh biện 1v1)',
    live_badge: '🔴 ĐANG LIVESTREAM',
    btn_watch_live: '📺 XEM TRỰC TIẾP & BÌNH CHỌN',
    btn_enter_arena: '⚔️ VÀO PHÒNG THI ĐẤU',
    leaderboard_title: '🏆 BẢNG XẾP HẠNG CAO THỦ ARENA',
    anti_cheat_tab_warn: '⚠️ CẢNH BÁO GIAN LẬN: Phát hiện bạn vừa rời khỏi màn hình thi đấu! Hệ thống đã ghi nhận vi phạm.',
    prep_lock_notice: '🔒 Đề bài đang được khóa bảo mật và sẽ mở ngay khi bắt đầu đếm ngược.',
    billing_title: '💰 ĐỐI SOÁT DOANH THU & PHÍ NỀN TẢNG (B2B)',
    billing_gross: 'Tổng lệ phí thu từ thí sinh',
    billing_platform_fee: 'Phí thuê nền tảng cố định',
    billing_commission: 'Chiết khấu % theo thí sinh',
    billing_net: 'Doanh thu thực nhận của Đơn vị',
  },
  en: {
    brand_title: 'VIPESPEAK ARENA • AI ENGLISH SPEAKING ESPORTS',
    nav_hub: '🏟️ Arena Hub',
    nav_cefr_test: '🎓 CEFR Placement',
    nav_profile: '👤 Profile & History',
    nav_organizer: '💼 Organizer Portal',
    hero_badge: 'GLOBAL STANDARD AI SPEAKING TOURNAMENT & ASSESSMENT PLATFORM',
    hero_title: 'MASTER ENGLISH SPEAKING & LIVE DEBATE ARENA',
    hero_subtitle: 'Compete in Solo, Team Relay, Situational Roleplay & 1v1 Live Debate powered by real-time AI Examiners.',
    btn_join_now: '🚀 ENTER TOURNAMENT NOW',
    btn_cefr_placement: '📊 TAKE CEFR PLACEMENT TEST',
    filter_all: 'All Events',
    filter_online: '🌐 Online (Remote)',
    filter_offline: '🏟️ Offline (On-Stage)',
    mode_solo: '🥊 Solo Battle',
    mode_relay: '🏃 Team Relay (2v2 / Pair)',
    mode_roleplay: '🎭 Roleplay Pair',
    mode_debate: '⚖️ 1v1 Live Debate',
    live_badge: '🔴 LIVE NOW',
    btn_watch_live: '📺 WATCH LIVE & VOTE',
    btn_enter_arena: '⚔️ JOIN MATCH ROOM',
    leaderboard_title: '🏆 ARENA ELO LEADERBOARD',
    anti_cheat_tab_warn: '⚠️ ANTI-CHEAT ALERT: Tab switch detected during active match! Violation logged.',
    prep_lock_notice: '🔒 Prompt is encrypted and will unlock automatically when the timer starts.',
    billing_title: '💰 ORGANIZER REVENUE & PLATFORM COMMISSION LEDGER',
    billing_gross: 'Gross Participant Entry Fees',
    billing_platform_fee: 'Fixed Platform Hosting Fee',
    billing_commission: 'Per-Participant Commission Cut',
    billing_net: 'Net Organizer Payout',
  },
};

export function getBilingualText(
  jsonField: { vi?: string; en?: string } | string | null | undefined,
  lang: AppLang
): string {
  if (!jsonField) return '';
  if (typeof jsonField === 'string') return jsonField;
  return jsonField[lang] || jsonField.en || jsonField.vi || '';
}