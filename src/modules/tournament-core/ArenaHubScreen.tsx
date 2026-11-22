// src/modules/tournament-core/ArenaHubScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
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
  mode: 'SOLO' | 'RELAY' | 'ROLEPLAY' | 'DEBATE';
  cefr_level: string;
  player1_name: string;
  player2_name?: string;
  player1_score: number;
  player2_score: number;
  live_status: string;
  live_stream_url?: string;
  audience_votes_p1: number;
  audience_votes_p2: number;
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

  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatchItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc đa chiều
  const [filterVenue, setFilterVenue] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'SOLO' | 'RELAY' | 'ROLEPLAY' | 'DEBATE'>('ALL');
  const [filterCefr, setFilterCefr] = useState<string>('ALL');

  // Panel đối soát thu phí của Đơn vị tổ chức
  const [selectedBillingTourney, setSelectedBillingTourney] = useState<TournamentItem | null>(null);
  const [billingStats, setBillingStats] = useState<{ count: number; gross: number; platformCut: number; net: number } | null>(null);

  useEffect(() => {
    loadArenaData();

    // Lắng nghe cập nhật Livestream & Bình chọn theo thời gian thực qua Supabase Realtime
    if (!supabase) return;
    const channel = supabase
      .channel('arena-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchLiveMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveMatches = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('is_live', true)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setLiveMatches(data as LiveMatchItem[]);
  };

  const loadArenaData = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      const [tourneyRes, liveRes, rankRes] = await Promise.all([
        supabase.from('tournaments').select('*').order('start_at', { ascending: false }),
        supabase.from('matches').select('*').eq('is_live', true).order('created_at', { ascending: false }).limit(10),
        supabase
          .from('profiles')
          .select('id, full_name, student_id, elo_rating, current_cefr, wins, total_matches, avg_wpm')
          .order('elo_rating', { ascending: false })
          .limit(10),
      ]);

      if (tourneyRes.data) setTournaments(tourneyRes.data as TournamentItem[]);
      if (liveRes.data) setLiveMatches(liveRes.data as LiveMatchItem[]);
      if (rankRes.data) setLeaderboard(rankRes.data);
    } finally {
      setLoading(false);
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
      {/* TOP NAVIGATION BAR + CHUYỂN ĐỔI SONG NGỮ VI / EN */}
      <View style={styles.navbar}>
        <Text style={styles.brandTitle}>{t.brand_title}</Text>
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
            <Text style={styles.langToggleText}>{lang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HERO SECTION GIỚI THIỆU GIẢI ĐẤU */}
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>{t.hero_badge}</Text>
          <Text style={styles.heroTitle}>{t.hero_title}</Text>
          <Text style={styles.heroSubtitle}>{t.hero_subtitle}</Text>

          <View style={styles.heroBtnRow}>
            <TouchableOpacity style={styles.primaryCtaBtn} onPress={onNavigateCefrTest}>
              <Text style={styles.primaryCtaText}>{t.btn_cefr_placement}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCtaBtn} onPress={onNavigateProfile}>
              <Text style={styles.secondaryCtaText}>{t.nav_profile}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KHU VỰC CÁC TRẬN ĐANG LIVESTREAM TRỰC TIẾP */}
        {liveMatches.length > 0 && (
          <View style={styles.liveSection}>
            <Text style={styles.sectionTitle}>{t.live_badge} ({liveMatches.length})</Text>
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
                    Điểm AI: {m.player1_score}đ {m.player2_name ? `— ${m.player2_score}đ` : ''} | 👏 {m.audience_votes_p1 + m.audience_votes_p2}
                  </Text>
                  <TouchableOpacity style={styles.watchLiveBtn} onPress={() => onWatchLivestream(m)}>
                    <Text style={styles.watchLiveBtnText}>{t.btn_watch_live}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* BỘ LỌC GIẢI ĐẤU: ONLINE/OFFLINE • SOLO/RELAY/ROLEPLAY/DEBATE • CEFR */}
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
                style={[styles.chip, filterMode === m && styles.chipActivePink]}
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
          <ActivityIndicator size="large" color="#00FFFF" style={{ marginVertical: 24 }} />
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
                    : 'FREE'}
                </Text>
              </View>

              <Text style={styles.tourneyTitle}>{getBilingualText(tourney.title, lang)}</Text>
              <Text style={styles.tourneyDesc}>{getBilingualText(tourney.description, lang)}</Text>
              <Text style={styles.organizerMeta}>
                🏛️ {tourney.organizer_name} • {tourney.device_mode === 'SINGLE_DEVICE' ? '📱 Chung 1 máy (Sân khấu)' : '💻 2 thiết bị từ xa'}
              </Text>

              <View style={styles.tourneyActions}>
                <TouchableOpacity
                  style={styles.enterArenaBtn}
                  onPress={() => onEnterMatchStage(tourney)}
                >
                  <Text style={styles.enterArenaBtnText}>{t.btn_enter_arena}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.billingBtn}
                  onPress={() => handleInspectBilling(tourney)}
                >
                  <Text style={styles.billingBtnText}>💰 ĐỐI SOÁT PHÍ ({tourney.platform_commission_percent}%)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* PANEL ĐỐI SOÁT DOANH THU & HOA HỒNG % ĐƠN VỊ TỔ CHỨC */}
        {selectedBillingTourney && billingStats && (
          <View style={styles.billingCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.billingTitle}>{t.billing_title}</Text>
              <TouchableOpacity onPress={() => setSelectedBillingTourney(null)}>
                <Text style={{ color: '#FF0055', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.billingSub}>
              {getBilingualText(selectedBillingTourney.title, lang)} • {billingStats.count} thí sinh đã check-in
            </Text>
            <View style={styles.billingGrid}>
              <View style={styles.billingCell}>
                <Text style={styles.billingLabel}>{t.billing_gross}</Text>
                <Text style={styles.billingVal}>{billingStats.gross.toLocaleString()} {selectedBillingTourney.currency}</Text>
              </View>
              <View style={styles.billingCell}>
                <Text style={styles.billingLabel}>{t.billing_commission} ({selectedBillingTourney.platform_commission_percent}% + Base)</Text>
                <Text style={[styles.billingVal, { color: '#FF007F' }]}>
                  -{billingStats.platformCut.toLocaleString()} {selectedBillingTourney.currency}
                </Text>
              </View>
              <View style={styles.billingCell}>
                <Text style={styles.billingLabel}>{t.billing_net}</Text>
                <Text style={[styles.billingVal, { color: '#39FF14' }]}>
                  {billingStats.net.toLocaleString()} {selectedBillingTourney.currency}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* BẢNG XẾP HẠNG ELO THỜI GIAN THỰC */}
        <View style={styles.leaderboardCard}>
          <Text style={styles.sectionTitle}>{t.leaderboard_title}</Text>
          {leaderboard.map((player, idx) => (
            <View key={player.id || idx} style={styles.rankRow}>
              <Text style={styles.rankIndex}>#{idx + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rankName}>{player.full_name || 'Competitor'}</Text>
                <Text style={styles.rankMeta}>
                  CEFR {player.current_cefr || 'B1'} • {player.wins || 0}W / {player.total_matches || 0}M • {player.avg_wpm || 120} WPM
                </Text>
              </View>
              <Text style={styles.rankElo}>{player.elo_rating || 1000} ELO</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05020D', padding: 16, paddingTop: 40 },
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  brandTitle: { color: '#00FFFF', fontSize: 12, fontWeight: '900' },
  navActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  navBtn: { backgroundColor: '#130628', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#332255' },
  navBtnText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  langToggleBtn: { backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  langToggleText: { color: '#000', fontSize: 10, fontWeight: '900' },

  heroCard: { backgroundColor: '#0D0620', borderRadius: 16, borderWidth: 2, borderColor: '#00FFFF', padding: 18, marginBottom: 16 },
  heroBadge: { color: '#39FF14', fontSize: 9.5, fontWeight: '900', marginBottom: 6 },
  heroTitle: { color: '#FFD700', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  heroSubtitle: { color: '#D0D0E8', fontSize: 11, lineHeight: 17, marginBottom: 14 },
  heroBtnRow: { flexDirection: 'row', gap: 10 },
  primaryCtaBtn: { flex: 1, backgroundColor: '#39FF14', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  primaryCtaText: { color: '#000', fontSize: 10.5, fontWeight: '900' },
  secondaryCtaBtn: { flex: 1, backgroundColor: '#1E0B36', paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: '#FF007F', alignItems: 'center' },
  secondaryCtaText: { color: '#FF007F', fontSize: 10.5, fontWeight: '900' },

  liveSection: { marginBottom: 16 },
  sectionTitle: { color: '#FFD700', fontSize: 12, fontWeight: '900', marginBottom: 8 },
  liveCard: { width: 260, backgroundColor: '#1A0518', borderRadius: 12, borderWidth: 1.5, borderColor: '#FF0055', padding: 12, marginRight: 10 },
  liveHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  livePill: { color: '#FF0055', fontSize: 9.5, fontWeight: '900' },
  cefrPill: { backgroundColor: '#39FF14', color: '#000', fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  livePlayersText: { color: '#FFF', fontSize: 11.5, fontWeight: 'bold', marginBottom: 4 },
  liveScoreRow: { color: '#00FFFF', fontSize: 10, marginBottom: 8 },
  watchLiveBtn: { backgroundColor: '#FF0055', paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  watchLiveBtnText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  filterBox: { gap: 8, marginBottom: 14 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#130628', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#332255' },
  chipSmall: { backgroundColor: '#130628', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#332255' },
  chipActive: { backgroundColor: '#00FFFF', borderColor: '#00FFFF' },
  chipActivePink: { backgroundColor: '#FF007F', borderColor: '#FF007F' },
  chipText: { color: '#AAAABB', fontSize: 9.5, fontWeight: 'bold' },
  chipTextActive: { color: '#000', fontWeight: '900' },

  tourneyCard: { backgroundColor: '#0D0620', borderRadius: 14, borderWidth: 1.5, borderColor: '#332255', padding: 14, marginBottom: 12 },
  tourneyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  venueBadge: { backgroundColor: '#0B192C', color: '#00FFFF', fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  modeBadge: { backgroundColor: '#1E0B36', color: '#FF007F', fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  feeBadge: { color: '#FFD700', fontSize: 10.5, fontWeight: '900' },
  tourneyTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', marginBottom: 4 },
  tourneyDesc: { color: '#B0B0CC', fontSize: 10.5, lineHeight: 15, marginBottom: 6 },
  organizerMeta: { color: '#8888AA', fontSize: 9.5, marginBottom: 10 },
  tourneyActions: { flexDirection: 'row', gap: 8 },
  enterArenaBtn: { flex: 1.3, backgroundColor: '#39FF14', paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  enterArenaBtnText: { color: '#000', fontSize: 10, fontWeight: '900' },
  billingBtn: { flex: 1, backgroundColor: '#1A0B2E', paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: '#FFD700', alignItems: 'center' },
  billingBtnText: { color: '#FFD700', fontSize: 9.5, fontWeight: 'bold' },

  billingCard: { backgroundColor: '#0B192C', borderRadius: 14, borderWidth: 1.5, borderColor: '#FFD700', padding: 14, marginBottom: 14 },
  billingTitle: { color: '#FFD700', fontSize: 11.5, fontWeight: '900' },
  billingSub: { color: '#00FFFF', fontSize: 10, marginBottom: 10 },
  billingGrid: { flexDirection: 'row', gap: 8 },
  billingCell: { flex: 1, backgroundColor: '#070212', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#221144' },
  billingLabel: { color: '#8888AA', fontSize: 8.5, marginBottom: 4 },
  billingVal: { color: '#FFF', fontSize: 11.5, fontWeight: '900' },

  leaderboardCard: { backgroundColor: '#0D0620', borderRadius: 14, borderWidth: 1.5, borderColor: '#00FFFF', padding: 14 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1A0B2E', gap: 10 },
  rankIndex: { color: '#FFD700', fontSize: 12, fontWeight: '900', width: 28 },
  rankName: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  rankMeta: { color: '#8888AA', fontSize: 9 },
  rankElo: { color: '#39FF14', fontSize: 11.5, fontWeight: '900' },
});