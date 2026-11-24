// E:\DuAnAI\VipeSpeak-arena\src\modules\tournament-core\ArenaHubScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { ARENA_TRANSLATIONS, AppLang, getBilingualText } from '../i18n/translations';

export interface TournamentItem {
  id: string;
  title: { vi: string; en: string };
  description: { vi: string; en: string };
  mode: 'SOLO' | 'RELAY' | 'ROLEPLAY' | 'DEBATE';
  cefr_level: string;
  venue_type: 'ONLINE' | 'OFFLINE';
  device_mode: 'SINGLE_DEVICE' | 'TWO_DEVICES';
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
  organizer_name: string;
  currency: 'VND' | 'USD';
  platform_fee: number;
  entry_fee_per_student: number;
  platform_commission_percent: number;
  start_at: string;
}

export interface LiveMatchItem {
  id: string;
  tournament_id: string;
  round_name: string;
  room_code?: string;
  mode: 'SOLO' | 'RELAY' | 'ROLEPLAY' | 'DEBATE';
  cefr_level: string;
  player1_code?: string;
  player2_code?: string;
  player1_name: string;
  player2_name?: string;
  player1_score: number;
  player2_score: number;
  final_score?: number;
  player1_audio_url?: string | null;
  player2_audio_url?: string | null;
  ai_feedback?: { vi?: string; en?: string } | null;
  live_status: string;
  live_stream_url?: string;
  audience_votes_p1: number;
  audience_votes_p2: number;
  created_at?: string;
}

interface Props {
  onNavigateCefrTest: () => void;
  onNavigateProfile: () => void;
  onEnterMatchStage: (tournament: TournamentItem, matchId?: string) => void;
  onWatchLivestream: (match: LiveMatchItem) => void;
}

export default function ArenaHubScreen({
  onNavigateCefrTest,
  onNavigateProfile,
  onEnterMatchStage,
  onWatchLivestream,
}: Props) {
  const [lang, setLang] = useState<AppLang>('vi');
  const t = ARENA_TRANSLATIONS[lang];
  const isVi = lang === 'vi';

  const [hubTab, setHubTab] = useState<'TOURNAMENTS' | 'AUDIO_VAR'>('TOURNAMENTS');
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatchItem[]>([]);
  const [recentMatches, setRecentMatches] = useState<LiveMatchItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc đa chiều
  const [filterVenue, setFilterVenue] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'SOLO' | 'RELAY' | 'ROLEPLAY' | 'DEBATE'>('ALL');
  const [filterCefr, setFilterCefr] = useState<string>('ALL');

  // Panel đối soát thu phí của Đơn vị tổ chức
  const [selectedBillingTourney, setSelectedBillingTourney] = useState<TournamentItem | null>(null);
  const [billingStats, setBillingStats] = useState<{ count: number; gross: number; platformCut: number; net: number } | null>(null);

  // Modal / Form Tạo Giải Đấu & Phòng Thi Trong 3 Phút
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitleVi, setNewTitleVi] = useState<string>('');
  const [newOrganizer, setNewOrganizer] = useState<string>('Khoa Ngoại Ngữ • VipeSpeak Lab');
  const [newMode, setNewMode] = useState<'SOLO' | 'RELAY' | 'ROLEPLAY' | 'DEBATE'>('SOLO');
  const [newCefr, setNewCefr] = useState<string>('B1');
  const [newVenue, setNewVenue] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [newDeviceMode, setNewDeviceMode] = useState<'SINGLE_DEVICE' | 'TWO_DEVICES'>('SINGLE_DEVICE');
  const [isCreatingTourney, setIsCreatingTourney] = useState<boolean>(false);
  const [hubStatusMsg, setHubStatusMsg] = useState<string>('');

  // State Phòng Thẩm Định Giảng Viên (Audio VAR)
  const [varScoreInputs, setVarScoreInputs] = useState<Record<string, { p1: string; p2: string }>>({});
  const [savingVarId, setSavingVarId] = useState<string | null>(null);

  useEffect(() => {
    loadArenaData();

    if (!supabase) return;
    const channel = supabase
      .channel('arena-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatchesRealtime();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMatchesRealtime = async () => {
    if (!supabase) return;
    const [liveRes, recentRes] = await Promise.all([
      supabase.from('matches').select('*').eq('is_live', true).order('created_at', { ascending: false }).limit(10),
      supabase.from('matches').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    if (liveRes.data) setLiveMatches(liveRes.data as LiveMatchItem[]);
    if (recentRes.data) setRecentMatches(recentRes.data as LiveMatchItem[]);
  };

  const loadArenaData = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      const [tourneyRes, liveRes, recentRes, rankRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
        supabase.from('matches').select('*').eq('is_live', true).order('created_at', { ascending: false }).limit(10),
        supabase.from('matches').select('*').order('created_at', { ascending: false }).limit(20),
        supabase
          .from('profiles')
          .select('id, full_name, student_id, elo_rating, current_cefr, wins, total_matches, avg_wpm')
          .order('elo_rating', { ascending: false })
          .limit(10),
      ]);

      if (tourneyRes.data) setTournaments(tourneyRes.data as TournamentItem[]);
      if (liveRes.data) setLiveMatches(liveRes.data as LiveMatchItem[]);
      if (recentRes.data) setRecentMatches(recentRes.data as LiveMatchItem[]);
      if (rankRes.data) setLeaderboard(rankRes.data);
    } finally {
      setLoading(false);
    }
  };

  // Tạo nhanh giải đấu / phòng thi lớp học trong 3 phút
  const handleCreateTournament = async () => {
    if (!newTitleVi.trim()) {
      setHubStatusMsg(isVi ? '⚠️ Vui lòng nhập tên giải đấu hoặc tên lớp học!' : '⚠️ Please enter tournament/class title!');
      return;
    }
    if (!supabase) return;

    setIsCreatingTourney(true);
    setHubStatusMsg('');
    try {
      const cleanTitle = newTitleVi.trim();
      const { data: created, error } = await supabase
        .from('tournaments')
        .insert([
          {
            title: { vi: cleanTitle, en: `${cleanTitle} (${newMode} • ${newCefr})` },
            description: {
              vi: `Đấu trường thực hành nói chuẩn CEFR ${newCefr} thể thức ${newMode} — Tự động kiểm định âm vị IPA & Audio VAR.`,
              en: `CEFR ${newCefr} ${newMode} speaking competition with automated Gemini IPA audit & Audio VAR.`,
            },
            mode: newMode,
            cefr_level: newCefr,
            venue_type: newVenue,
            device_mode: newDeviceMode,
            status: 'LIVE',
            organizer_name: newOrganizer.trim() || 'VipeSpeak Academic Hub',
            currency: 'VND',
            platform_fee: 0,
            entry_fee_per_student: 0,
            platform_commission_percent: 0,
            start_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (created) {
        setTournaments((prev) => [created as TournamentItem, ...prev]);
        setShowCreateModal(false);
        setNewTitleVi('');
        setHubStatusMsg(isVi ? '✅ Đã khởi tạo giải đấu & phòng thi thành công!' : '✅ Tournament & Arena room created!');
      }
    } catch (err: any) {
      setHubStatusMsg(`❌ ${err?.message || 'Lỗi tạo giải đấu'}`);
    } finally {
      setIsCreatingTourney(false);
    }
  };

  // Giảng viên chốt điểm thẩm định Audio VAR
  const handleConfirmVarScore = async (match: LiveMatchItem) => {
    if (!supabase) return;
    const draft = varScoreInputs[match.id];
    const p1Score = draft?.p1 !== undefined && draft.p1 !== '' ? Number(draft.p1) : Number(match.player1_score || 0);
    const p2Score = draft?.p2 !== undefined && draft.p2 !== '' ? Number(draft.p2) : Number(match.player2_score || 0);

    if (Number.isNaN(p1Score) || p1Score < 0 || p1Score > 100 || Number.isNaN(p2Score) || p2Score < 0 || p2Score > 100) {
      setHubStatusMsg('⚠️ Điểm thẩm định VAR phải nằm trong khoảng 0 – 100.');
      return;
    }

    setSavingVarId(match.id);
    setHubStatusMsg('');
    try {
      const isPair = match.mode === 'RELAY' || match.mode === 'ROLEPLAY';
      const newFinal = isPair
        ? Math.min(100, Math.round((p1Score + p2Score) / 2 + 5))
        : match.player2_name
        ? Math.max(p1Score, p2Score)
        : p1Score;

      const newWinner =
        match.player2_code && p2Score > p1Score ? match.player2_code : match.player1_code || null;

      const { error } = await supabase
        .from('matches')
        .update({
          player1_score: Math.round(p1Score),
          player2_score: Math.round(p2Score),
          final_score: Math.round(newFinal),
          winner_code: newWinner,
          live_status: 'VAR_VERIFIED',
        })
        .eq('id', match.id);

      if (error) throw error;

      setRecentMatches((prev) =>
        prev.map((item) =>
          item.id === match.id
            ? {
                ...item,
                player1_score: Math.round(p1Score),
                player2_score: Math.round(p2Score),
                final_score: Math.round(newFinal),
                live_status: 'VAR_VERIFIED',
              }
            : item
        )
      );
      setHubStatusMsg(
        isVi
          ? `✅ Đã chốt phán quyết Audio VAR cho trận của ${match.player1_name} (${Math.round(newFinal)}đ)!`
          : `✅ Audio VAR verdict locked for ${match.player1_name} (${Math.round(newFinal)} pts)!`
      );
    } catch (err: any) {
      setHubStatusMsg(`❌ ${err?.message || 'Lỗi lưu điểm VAR'}`);
    } finally {
      setSavingVarId(null);
    }
  };

  // Tính toán đối soát doanh thu & hoa hồng % trên mỗi thí sinh từ Sổ cái bất biến
  const handleInspectBilling = async (tourney: TournamentItem) => {
    setSelectedBillingTourney(tourney);
    if (!supabase) return;

    const { data } = await supabase
      .from('tournament_participants')
      .select('fee_paid, platform_cut_amount')
      .eq('tournament_id', tourney.id);

    const rows = data || [];
    const count = rows.length;
    const gross = rows.reduce((sum: number, r: any) => sum + Number(r.fee_paid || 0), 0);
    const commissionSum = rows.reduce((sum: number, r: any) => sum + Number(r.platform_cut_amount || 0), 0);
    const totalPlatformCut = Number(tourney.platform_fee || 0) + commissionSum;
    const net = Math.max(0, gross - totalPlatformCut);

    setBillingStats({ count, gross, platformCut: totalPlatformCut, net });
  };

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((item) => {
      if (filterVenue !== 'ALL' && item.venue_type !== filterVenue) return false;
      if (filterMode !== 'ALL' && item.mode !== filterMode) return false;
      if (filterCefr !== 'ALL' && item.cefr_level !== filterCefr && item.cefr_level !== 'OPEN') return false;
      return true;
    });
  }, [tournaments, filterVenue, filterMode, filterCefr]);

  return (
    <View style={styles.container}>
      <View style={styles.innerMax}>
        {/* TOP NAVIGATION BAR */}
        <View style={styles.navbar}>
          <Text style={styles.brandTitle}>🏟️ {t.brand_title}</Text>
          <View style={styles.navActions}>
            <TouchableOpacity style={styles.navBtn} onPress={onNavigateCefrTest}>
              <Text style={styles.navBtnText}>{t.nav_cefr_test}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={onNavigateProfile}>
              <Text style={styles.navBtnText}>{t.nav_profile}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.langToggleBtn}
              onPress={() => setLang((prev) => (prev === 'vi' ? 'en' : 'vi'))}
            >
              <Text style={styles.langToggleText}>🌐 {lang.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {hubStatusMsg ? (
          <View style={styles.statusToast}>
            <Text style={styles.statusToastText}>{hubStatusMsg}</Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
          {/* HERO SECTION & NÚT MỞ GIẢI ĐẤU 3 PHÚT */}
          <View style={styles.heroCard}>
            <Text style={styles.heroBadge}>✨ {t.hero_badge}</Text>
            <Text style={styles.heroTitle}>{t.hero_title}</Text>
            <Text style={styles.heroSubtitle}>{t.hero_subtitle}</Text>

            <View style={styles.heroBtnRow}>
              <TouchableOpacity
                style={styles.primaryCtaBtn}
                onPress={() => setShowCreateModal((v) => !v)}
              >
                <Text style={styles.primaryCtaText}>
                  {showCreateModal
                    ? isVi
                      ? '✕ ĐÓNG TRÌNH TẠO GIẢI ĐẤU'
                      : '✕ CLOSE BUILDER'
                    : isVi
                    ? '➕ MỞ GIẢI ĐẤU / PHÒNG THI (3 PHÚT)'
                    : '➕ CREATE ARENA ROOM (3 MIN)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryCtaBtn} onPress={onNavigateCefrTest}>
                <Text style={styles.secondaryCtaText}>{t.btn_cefr_placement}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FORM KHỞI TẠO GIẢI ĐẤU / LỚP HỌC TRONG 3 PHÚT */}
          {showCreateModal && (
            <View style={styles.builderCard}>
              <Text style={styles.builderTitle}>
                🚀 {isVi ? 'KHỞI TẠO GIẢI ĐẤU / PHÒNG THI LỚP HỌC MỚI' : 'LAUNCH NEW TOURNAMENT / CLASS ROOM'}
              </Text>
              <Text style={styles.builderSub}>
                {isVi
                  ? 'Hệ thống tự động cấp sân khấu thi đấu, bộ đếm chống chuyển tab và chấm âm vị IPA'
                  : 'Automatically configures arena stage, tab-switch guard, and Gemini IPA scoring'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder={isVi ? 'Tên giải đấu / Lớp học (VD: Đấu Trường Tiếng Anh B1 - K4)...' : 'Tournament or Class Name...'}
                placeholderTextColor="#64748B"
                value={newTitleVi}
                onChangeText={setNewTitleVi}
              />

              <TextInput
                style={styles.input}
                placeholder={isVi ? 'Đơn vị tổ chức / Giảng viên phụ trách' : 'Organizer / Instructor Name'}
                placeholderTextColor="#64748B"
                value={newOrganizer}
                onChangeText={setNewOrganizer}
              />

              <Text style={styles.fieldLabel}>{isVi ? 'Chọn thể thức thi đấu:' : 'Competition Mode:'}</Text>
              <View style={styles.filterRow}>
                {(['SOLO', 'RELAY', 'ROLEPLAY', 'DEBATE'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, newMode === m && styles.chipActive]}
                    onPress={() => setNewMode(m)}
                  >
                    <Text style={[styles.chipText, newMode === m && styles.chipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{isVi ? 'Cấp độ CEFR mục tiêu:' : 'Target CEFR:'}</Text>
              <View style={styles.filterRow}>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.chipSmall, newCefr === lvl && styles.chipActive]}
                    onPress={() => setNewCefr(lvl)}
                  >
                    <Text style={[styles.chipText, newCefr === lvl && styles.chipTextActive]}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.filterRow}>
                {(['ONLINE', 'OFFLINE'] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, newVenue === v && styles.chipActiveSky]}
                    onPress={() => setNewVenue(v)}
                  >
                    <Text style={[styles.chipText, newVenue === v && styles.chipTextActive]}>
                      {v === 'ONLINE' ? '🌐 ONLINE' : '🏟️ OFFLINE'}
                    </Text>
                  </TouchableOpacity>
                ))}

                {(['SINGLE_DEVICE', 'TWO_DEVICES'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, newDeviceMode === d && styles.chipActiveSky]}
                    onPress={() => setNewDeviceMode(d)}
                  >
                    <Text style={[styles.chipText, newDeviceMode === d && styles.chipTextActive]}>
                      {d === 'SINGLE_DEVICE' ? '📱 Chung 1 máy' : '💻 2 thiết bị từ xa'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryCtaBtn}
                disabled={isCreatingTourney}
                onPress={handleCreateTournament}
              >
                {isCreatingTourney ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <Text style={styles.primaryCtaText}>
                    ✅ {isVi ? 'XUẤT BẢN GIẢI ĐẤU NGAY' : 'PUBLISH ARENA NOW'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* CHUYỂN TAB: SẢNH GIẢI ĐẤU VS PHÒNG THẨM ĐỊNH AUDIO VAR */}
          <View style={styles.hubTabsRow}>
            <TouchableOpacity
              style={[styles.hubTabBtn, hubTab === 'TOURNAMENTS' && styles.hubTabBtnActive]}
              onPress={() => setHubTab('TOURNAMENTS')}
            >
              <Text style={[styles.hubTabText, hubTab === 'TOURNAMENTS' && styles.hubTabTextActive]}>
                ⚔️ {isVi ? `Sảnh Giải Đấu & BXH (${filteredTournaments.length})` : `Tournaments & ELO (${filteredTournaments.length})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.hubTabBtn, hubTab === 'AUDIO_VAR' && styles.hubTabBtnVarActive]}
              onPress={() => setHubTab('AUDIO_VAR')}
            >
              <Text style={[styles.hubTabText, hubTab === 'AUDIO_VAR' && styles.hubTabTextVarActive]}>
                🛡️ {isVi ? `Phòng Audio VAR Giảng Viên (${recentMatches.length})` : `Teacher Audio VAR Lab (${recentMatches.length})`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* =================================================================
              TAB 1: SẢNH GIẢI ĐẤU, LIVESTREAM & BẢNG XẾP HẠNG ELO
             ================================================================= */}
          {hubTab === 'TOURNAMENTS' && (
            <>
              {/* KHU VỰC CÁC TRẬN ĐANG LIVESTREAM TRỰC TIẾP */}
              {liveMatches.length > 0 && (
                <View style={styles.liveSection}>
                  <Text style={styles.sectionTitle}>🔴 {t.live_badge} ({liveMatches.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {liveMatches.map((m) => (
                      <View key={m.id} style={styles.liveCard}>
                        <View style={styles.liveHeaderRow}>
                          <Text style={styles.livePill}>🔴 LIVE • {m.mode}</Text>
                          <Text style={styles.cefrPill}>{m.cefr_level}</Text>
                        </View>
                        <Text style={styles.livePlayersText}>
                          {m.player1_name} {m.player2_name ? `🆚 ${m.player2_name}` : ''}
                        </Text>
                        <Text style={styles.liveScoreRow}>
                          Điểm AI: {m.player1_score}đ {m.player2_name ? `— ${m.player2_score}đ` : ''} | 👏{' '}
                          {(m.audience_votes_p1 || 0) + (m.audience_votes_p2 || 0)}
                        </Text>
                        <TouchableOpacity style={styles.watchLiveBtn} onPress={() => onWatchLivestream(m)}>
                          <Text style={styles.watchLiveBtnText}>{t.btn_watch_live}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* BỘ LỌC GIẢI ĐẤU */}
              <View style={styles.filterBox}>
                <View style={styles.filterRow}>
                  {(['ALL', 'ONLINE', 'OFFLINE'] as const).map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.chip, filterVenue === v && styles.chipActive]}
                      onPress={() => setFilterVenue(v)}
                    >
                      <Text style={[styles.chipText, filterVenue === v && styles.chipTextActive]}>
                        {v === 'ALL' ? t.filter_all : v === 'ONLINE' ? t.filter_online : t.filter_offline}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.filterRow}>
                  {(['ALL', 'SOLO', 'RELAY', 'ROLEPLAY', 'DEBATE'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, filterMode === m && styles.chipActiveSky]}
                      onPress={() => setFilterMode(m)}
                    >
                      <Text style={[styles.chipText, filterMode === m && styles.chipTextActive]}>
                        {m === 'ALL'
                          ? t.filter_all
                          : m === 'SOLO'
                          ? t.mode_solo
                          : m === 'RELAY'
                          ? t.mode_relay
                          : m === 'ROLEPLAY'
                          ? t.mode_roleplay
                          : t.mode_debate}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.filterRow}>
                  {['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.chipSmall, filterCefr === lvl && styles.chipActive]}
                      onPress={() => setFilterCefr(lvl)}
                    >
                      <Text style={[styles.chipText, filterCefr === lvl && styles.chipTextActive]}>{lvl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* DANH SÁCH GIẢI ĐẤU */}
              {loading ? (
                <ActivityIndicator size="large" color="#10B981" style={{ marginVertical: 24 }} />
              ) : (
                filteredTournaments.map((tourney) => (
                  <View key={tourney.id} style={styles.tourneyCard}>
                    <View style={styles.tourneyHeader}>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.venueBadge}>
                          {tourney.venue_type === 'ONLINE' ? '🌐 ONLINE' : '🏟️ OFFLINE'}
                        </Text>
                        <Text style={styles.modeBadge}>{tourney.mode}</Text>
                        <Text style={styles.cefrPill}>CEFR {tourney.cefr_level}</Text>
                      </View>
                      <Text style={styles.feeBadge}>
                        {tourney.entry_fee_per_student > 0
                          ? `${tourney.entry_fee_per_student.toLocaleString()} ${tourney.currency}`
                          : 'FREE ACCESS'}
                      </Text>
                    </View>

                    <Text style={styles.tourneyTitle}>{getBilingualText(tourney.title, lang)}</Text>
                    <Text style={styles.tourneyDesc}>{getBilingualText(tourney.description, lang)}</Text>
                    <Text style={styles.organizerMeta}>
                      🏛️ {tourney.organizer_name} •{' '}
                      {tourney.device_mode === 'SINGLE_DEVICE'
                        ? '📱 Chung 1 máy (Sân khấu)'
                        : '💻 2 thiết bị từ xa'}
                    </Text>

                    <View style={styles.tourneyActions}>
                      <TouchableOpacity
                        style={styles.enterArenaBtn}
                        onPress={() => onEnterMatchStage(tourney)}
                      >
                        <Text style={styles.enterArenaBtnText}>⚔️ {t.btn_enter_arena}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.billingBtn}
                        onPress={() => handleInspectBilling(tourney)}
                      >
                        <Text style={styles.billingBtnText}>
                          💰 ĐỐI SOÁT PHÍ ({tourney.platform_commission_percent || 0}%)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* PANEL ĐỐI SOÁT DOANH THU & HOA HỒNG % */}
              {selectedBillingTourney && billingStats && (
                <View style={styles.billingCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={styles.billingTitle}>{t.billing_title}</Text>
                    <TouchableOpacity onPress={() => setSelectedBillingTourney(null)}>
                      <Text style={{ color: '#F87171', fontWeight: 'bold', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.billingSub}>
                    {getBilingualText(selectedBillingTourney.title, lang)} • {billingStats.count} thí sinh đã check-in
                  </Text>
                  <View style={styles.billingGrid}>
                    <View style={styles.billingCell}>
                      <Text style={styles.billingLabel}>{t.billing_gross}</Text>
                      <Text style={styles.billingVal}>
                        {billingStats.gross.toLocaleString()} {selectedBillingTourney.currency}
                      </Text>
                    </View>
                    <View style={styles.billingCell}>
                      <Text style={styles.billingLabel}>
                        {t.billing_commission} ({selectedBillingTourney.platform_commission_percent || 0}% + Base)
                      </Text>
                      <Text style={[styles.billingVal, { color: '#F87171' }]}>
                        -{billingStats.platformCut.toLocaleString()} {selectedBillingTourney.currency}
                      </Text>
                    </View>
                    <View style={styles.billingCell}>
                      <Text style={styles.billingLabel}>{t.billing_net}</Text>
                      <Text style={[styles.billingVal, { color: '#10B981' }]}>
                        {billingStats.net.toLocaleString()} {selectedBillingTourney.currency}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* BẢNG XẾP HẠNG ELO THỜI GIAN THỰC */}
              <View style={styles.leaderboardCard}>
                <Text style={styles.sectionTitle}>🏆 {t.leaderboard_title}</Text>
                {leaderboard.map((player, idx) => (
                  <View key={player.id || idx} style={styles.rankRow}>
                    <Text style={styles.rankIndex}>#{idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankName}>{player.full_name || 'Competitor'}</Text>
                      <Text style={styles.rankMeta}>
                        CEFR {player.current_cefr || 'B1'} • {player.wins || 0}W / {player.total_matches || 0}M •{' '}
                        {player.avg_wpm || 120} WPM
                      </Text>
                    </View>
                    <Text style={styles.rankElo}>{player.elo_rating || 1000} ELO</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* =================================================================
              TAB 2: PHÒNG THẨM ĐỊNH GIẢNG VIÊN ("AUDIO VAR LAB")
             ================================================================= */}
          {hubTab === 'AUDIO_VAR' && (
            <View style={styles.varSection}>
              <View style={styles.varBanner}>
                <Text style={styles.varBannerTitle}>
                  🛡️ {isVi ? 'PHÒNG THẨM ĐỊNH AUDIO VAR GIẢNG VIÊN' : 'INSTRUCTOR AUDIO VAR VERIFICATION LAB'}
                </Text>
                <Text style={styles.varBannerDesc}>
                  {isVi
                    ? 'Nghe lại bản ghi âm gốc từng lượt thi đấu (SOLO, RELAY, ROLEPLAY, DEBATE), kiểm tra nhận xét AI và bấm chốt điểm chính thức đồng bộ tức thì lên Hộ chiếu SPEAK-ID.'
                    : 'Replay original recordings across all arena matches, review AI audit notes, and lock verified scores directly onto SPEAK-ID.'}
                </Text>
              </View>

              {recentMatches.length === 0 ? (
                <Text style={styles.emptyVarText}>
                  {isVi ? 'Chưa có trận đấu nào được ghi nhận.' : 'No recorded matches yet.'}
                </Text>
              ) : (
                recentMatches.map((m) => {
                  const draft = varScoreInputs[m.id] || {
                    p1: String(m.player1_score ?? 0),
                    p2: String(m.player2_score ?? 0),
                  };
                  const isVerified = m.live_status === 'VAR_VERIFIED';

                  return (
                    <View key={m.id} style={styles.varCard}>
                      <View style={styles.varTopRow}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <Text style={styles.modeBadge}>{m.mode}</Text>
                          <Text style={styles.cefrPill}>CEFR {m.cefr_level}</Text>
                          {m.room_code && <Text style={styles.roomChip}>🔑 {m.room_code}</Text>}
                        </View>
                        <Text style={[styles.varStatusBadge, isVerified && styles.varStatusVerified]}>
                          {isVerified
                            ? isVi
                              ? '✅ ĐÃ CHỐT VAR'
                              : '✅ VAR VERIFIED'
                            : isVi
                            ? '🤖 AI CHẤM TỰ ĐỘNG'
                            : '🤖 AI GRADED'}
                        </Text>
                      </View>

                      <Text style={styles.varMatchTitle}>
                        {m.player1_name} ({m.player1_code || 'P1'})
                        {m.player2_name ? `  🆚  ${m.player2_name} (${m.player2_code || 'P2'})` : ''}
                      </Text>

                      {/* Trình phát Audio P1 & P2 */}
                      <View style={styles.varAudioGrid}>
                        <View style={styles.varPlayerBox}>
                          <Text style={styles.varPlayerLabel}>
                            🎙️ P1: {m.player1_name} • AI: {m.player1_score}đ
                          </Text>
                          {m.player1_audio_url && Platform.OS === 'web' ? (
                            // @ts-ignore
                            <audio src={m.player1_audio_url} controls style={{ width: '100%', height: 32, marginTop: 6 }} />
                          ) : (
                            <Text style={styles.noAudioNote}>
                              {isVi ? 'Không có file ghi âm P1' : 'No P1 audio file'}
                            </Text>
                          )}
                          <View style={styles.varInputRow}>
                            <Text style={styles.varInputLabel}>
                              {isVi ? 'Chốt điểm P1:' : 'VAR P1 Score:'}
                            </Text>
                            <TextInput
                              style={styles.varScoreInput}
                              keyboardType="numeric"
                              value={draft.p1}
                              onChangeText={(val) =>
                                setVarScoreInputs((prev) => ({
                                  ...prev,
                                  [m.id]: { ...draft, p1: val },
                                }))
                              }
                            />
                          </View>
                        </View>

                        {m.player2_name && (
                          <View style={styles.varPlayerBox}>
                            <Text style={styles.varPlayerLabel}>
                              🎙️ P2: {m.player2_name} • AI: {m.player2_score}đ
                            </Text>
                            {m.player2_audio_url && Platform.OS === 'web' ? (
                              // @ts-ignore
                              <audio src={m.player2_audio_url} controls style={{ width: '100%', height: 32, marginTop: 6 }} />
                            ) : (
                              <Text style={styles.noAudioNote}>
                                {isVi ? 'Không có file ghi âm P2' : 'No P2 audio file'}
                              </Text>
                            )}
                            <View style={styles.varInputRow}>
                              <Text style={styles.varInputLabel}>
                                {isVi ? 'Chốt điểm P2:' : 'VAR P2 Score:'}
                              </Text>
                              <TextInput
                                style={styles.varScoreInput}
                                keyboardType="numeric"
                                value={draft.p2}
                                onChangeText={(val) =>
                                  setVarScoreInputs((prev) => ({
                                    ...prev,
                                    [m.id]: { ...draft, p2: val },
                                  }))
                                }
                              />
                            </View>
                          </View>
                        )}
                      </View>

                      {m.ai_feedback?.vi ? (
                        <Text style={styles.varFeedbackNote} numberOfLines={3}>
                          💬 {m.ai_feedback.vi}
                        </Text>
                      ) : null}

                      <TouchableOpacity
                        style={styles.confirmVarBtn}
                        disabled={savingVarId === m.id}
                        onPress={() => handleConfirmVarScore(m)}
                      >
                        {savingVarId === m.id ? (
                          <ActivityIndicator color="#020617" size="small" />
                        ) : (
                          <Text style={styles.confirmVarBtnText}>
                            ⚖️ {isVi ? 'CHỐT PHÁN QUYẾT AUDIO VAR & CẬP NHẬT ĐIỂM' : 'LOCK AUDIO VAR VERDICT'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120', padding: 16 },
  innerMax: { maxWidth: 1160, width: '100%', alignSelf: 'center', flex: 1 },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 10,
  },
  brandTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  navActions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  navBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  navBtnText: { color: '#E2E8F0', fontSize: 11.5, fontWeight: '700' },
  langToggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
  },
  langToggleText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' },

  statusToast: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.45)',
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
  },
  statusToastText: { color: '#6EE7B7', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    padding: 20,
    marginBottom: 16,
  },
  heroBadge: { color: '#10B981', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginBottom: 6 },
  heroSubtitle: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  heroBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryCtaBtn: {
    flex: 1,
    minWidth: 210,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryCtaText: { color: '#020617', fontSize: 12.5, fontWeight: '900' },
  secondaryCtaBtn: {
    flex: 1,
    minWidth: 210,
    backgroundColor: 'rgba(56,189,248,0.12)',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    alignItems: 'center',
  },
  secondaryCtaText: { color: '#7DD3FC', fontSize: 12.5, fontWeight: '800' },

  builderCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 18,
    marginBottom: 18,
    gap: 10,
  },
  builderTitle: { color: '#6EE7B7', fontSize: 15, fontWeight: '900' },
  builderSub: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  fieldLabel: { color: '#CBD5E1', fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  input: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },

  hubTabsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  hubTabBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  hubTabBtnActive: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderColor: '#10B981',
  },
  hubTabBtnVarActive: {
    backgroundColor: 'rgba(56,189,248,0.16)',
    borderColor: '#38BDF8',
  },
  hubTabText: { color: '#94A3B8', fontSize: 12.5, fontWeight: '800' },
  hubTabTextActive: { color: '#6EE7B7' },
  hubTabTextVarActive: { color: '#7DD3FC' },

  liveSection: { marginBottom: 18 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginBottom: 10 },
  liveCard: {
    width: 280,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(244,63,94,0.55)',
    padding: 14,
    marginRight: 12,
  },
  liveHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  livePill: { color: '#FDA4AF', fontSize: 11, fontWeight: '900' },
  cefrPill: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    color: '#6EE7B7',
    fontSize: 10.5,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  livePlayersText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginBottom: 4 },
  liveScoreRow: { color: '#7DD3FC', fontSize: 11.5, marginBottom: 10 },
  watchLiveBtn: { backgroundColor: '#F43F5E', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  watchLiveBtnText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '900' },

  filterBox: { gap: 8, marginBottom: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSmall: {
    backgroundColor: '#111827',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipActiveSky: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  chipText: { color: '#94A3B8', fontSize: 11.5, fontWeight: '700' },
  chipTextActive: { color: '#020617', fontWeight: '900' },

  tourneyCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 12,
  },
  tourneyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  venueBadge: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    color: '#7DD3FC',
    fontSize: 10.5,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeBadge: {
    backgroundColor: 'rgba(167,139,250,0.18)',
    color: '#DDD6FE',
    fontSize: 10.5,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feeBadge: { color: '#FCD34D', fontSize: 11.5, fontWeight: '900' },
  tourneyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  tourneyDesc: { color: '#CBD5E1', fontSize: 12.5, lineHeight: 18, marginBottom: 8 },
  organizerMeta: { color: '#94A3B8', fontSize: 11.5, marginBottom: 12 },
  tourneyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  enterArenaBtn: {
    flex: 1.4,
    minWidth: 180,
    backgroundColor: '#10B981',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  enterArenaBtnText: { color: '#020617', fontSize: 12, fontWeight: '900' },
  billingBtn: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#0B1120',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    alignItems: 'center',
  },
  billingBtnText: { color: '#FCD34D', fontSize: 11.5, fontWeight: '800' },

  billingCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.5)',
    padding: 16,
    marginBottom: 16,
  },
  billingTitle: { color: '#FCD34D', fontSize: 14, fontWeight: '900' },
  billingSub: { color: '#7DD3FC', fontSize: 12, marginBottom: 12 },
  billingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  billingCell: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#0B1120',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  billingLabel: { color: '#94A3B8', fontSize: 10.5, marginBottom: 4 },
  billingVal: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  leaderboardCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    padding: 16,
    marginTop: 6,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  rankIndex: { color: '#FCD34D', fontSize: 14, fontWeight: '900', width: 32 },
  rankName: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  rankMeta: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  rankElo: { color: '#10B981', fontSize: 13, fontWeight: '900' },

  varSection: { gap: 12 },
  varBanner: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    borderRadius: 14,
    padding: 16,
  },
  varBannerTitle: { color: '#7DD3FC', fontSize: 15, fontWeight: '900' },
  varBannerDesc: { color: '#CBD5E1', fontSize: 12.5, lineHeight: 19, marginTop: 4 },
  emptyVarText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  varCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  varTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  roomChip: { color: '#7DD3FC', fontSize: 11, fontWeight: '800' },
  varStatusBadge: { color: '#FCD34D', fontSize: 11, fontWeight: '800' },
  varStatusVerified: { color: '#6EE7B7' },
  varMatchTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  varAudioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  varPlayerBox: {
    flex: 1,
    minWidth: 250,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
  },
  varPlayerLabel: { color: '#E2E8F0', fontSize: 12, fontWeight: '800' },
  noAudioNote: { color: '#64748B', fontSize: 11.5, marginTop: 6 },
  varInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  varInputLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  varScoreInput: {
    width: 72,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  varFeedbackNote: { color: '#6EE7B7', fontSize: 12, lineHeight: 18 },
  confirmVarBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmVarBtnText: { color: '#020617', fontSize: 12, fontWeight: '900' },
});