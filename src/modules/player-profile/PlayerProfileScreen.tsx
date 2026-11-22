// src/modules/player-profile/PlayerProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '../../utils/supabase';

interface Props {
  initialStudentCode?: string;
  onBack: () => void;
}

export default function PlayerProfileScreen({ initialStudentCode = '', onBack }: Props) {
  const [searchCode, setSearchCode] = useState<string>(initialStudentCode);
  const [profileData, setProfileData] = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadPlayerProfileAndMatches = async (codeToLoad: string) => {
    const cleanCode = codeToLoad.trim().toUpperCase();
    if (!cleanCode || !supabase) return;

    setLoading(true);
    try {
      const [profRes, matchesRes] = await Promise.all([
        supabase.from('profiles').select('*').ilike('student_id', cleanCode).maybeSingle(),
        supabase
          .from('matches')
          .select('*')
          .or(`player1_code.ilike.${cleanCode},player2_code.ilike.${cleanCode}`)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setProfileData(profRes.data || null);
      setMatchHistory(matchesRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialStudentCode) {
      loadPlayerProfileAndMatches(initialStudentCode);
    }
  }, [initialStudentCode]);

  const totalMatches = matchHistory.length;
  const winsCount = matchHistory.filter(
    (m) => (m.winner_code || '').toUpperCase() === searchCode.trim().toUpperCase()
  ).length;
  const winRate = totalMatches > 0 ? Math.round((winsCount / totalMatches) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>🔙 SẢNH GIẢI ĐẤU</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👤 HỒ SƠ THÍ SINH & LỊCH SỬ TRẬN ĐẤU</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Thanh tra cứu MSSV */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Nhập Mã số sinh viên (VD: SV2026001)..."
          placeholderTextColor="#666688"
          autoCapitalize="characters"
          value={searchCode}
          onChangeText={setSearchCode}
        />
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => loadPlayerProfileAndMatches(searchCode)}
        >
          <Text style={styles.searchBtnText}>🔍 TRA CỨU</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#00FFFF" style={{ marginVertical: 30 }} />
        ) : (
          <>
            {/* THẺ PROFILE CÁ NHÂN */}
            <View style={styles.profileCard}>
              <View style={styles.profileTop}>
                <View>
                  <Text style={styles.playerName}>
                    {profileData?.full_name || matchHistory[0]?.player1_name || searchCode || 'Thí sinh Arena'}
                  </Text>
                  <Text style={styles.playerSub}>
                    MSSV: {searchCode.toUpperCase() || 'N/A'} • 🏅 {profileData?.badge_title || 'Arena Competitor'}
                  </Text>
                </View>
                <View style={styles.cefrBadgeBox}>
                  <Text style={styles.cefrBadgeText}>CEFR {profileData?.current_cefr || 'B1'}</Text>
                </View>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiCell}>
                  <Text style={styles.kpiLabel}>ĐIỂM ELO</Text>
                  <Text style={[styles.kpiVal, { color: '#39FF14' }]}>{profileData?.elo_rating || 1000}</Text>
                </View>
                <View style={styles.kpiCell}>
                  <Text style={styles.kpiLabel}>TỶ LỆ THẮNG</Text>
                  <Text style={[styles.kpiVal, { color: '#00FFFF' }]}>{winRate}%</Text>
                </View>
                <View style={styles.kpiCell}>
                  <Text style={styles.kpiLabel}>SỐ TRẬN</Text>
                  <Text style={styles.kpiVal}>{totalMatches}</Text>
                </View>
                <View style={styles.kpiCell}>
                  <Text style={styles.kpiLabel}>TỐC ĐỘ TB</Text>
                  <Text style={[styles.kpiVal, { color: '#FFD700' }]}>{profileData?.avg_wpm || 120} WPM</Text>
                </View>
              </View>
            </View>

            {/* DANH SÁCH LỊCH SỬ TRẬN ĐẤU (SOLO / RELAY / ROLEPLAY / DEBATE) */}
            <Text style={styles.sectionTitle}>⚔️ LỊCH SỬ THI ĐẤU & BẢN THU ĐỐI ĐÁP ({matchHistory.length})</Text>

            {matchHistory.length === 0 ? (
              <Text style={styles.emptyText}>
                Chưa tìm thấy lịch sử trận đấu cho MSSV này. Hãy nhập MSSV của bạn và bấm Tra cứu!
              </Text>
            ) : (
              matchHistory.map((m) => {
                const isWinner = (m.winner_code || '').toUpperCase() === searchCode.trim().toUpperCase();
                return (
                  <View key={m.id} style={styles.matchCard}>
                    <View style={styles.matchTopRow}>
                      <Text style={styles.modeTag}>
                        {m.mode} • CEFR {m.cefr_level}
                      </Text>
                      <Text style={[styles.outcomeTag, { color: isWinner ? '#39FF14' : '#FFD700' }]}>
                        {isWinner ? '🏆 CHIẾN THẮNG' : '⚔️ HOÀN THÀNH'} • {m.final_score || m.player1_score}đ
                      </Text>
                    </View>

                    <Text style={styles.matchPlayers}>
                      {m.player1_name} ({m.player1_score}đ)
                      {m.player2_name ? `  🆚  ${m.player2_name} (${m.player2_score}đ)` : ''}
                    </Text>

                    {m.prompt_data?.motion_en ? (
                      <Text style={styles.matchPrompt}>📌 "{m.prompt_data.motion_en}"</Text>
                    ) : null}

                    {/* Nghe lại audio của cả 2 thí sinh (Đối đáp Relay / Roleplay / Debate) */}
                    {m.player1_audio_url ? (
                      <View style={styles.audioBlock}>
                        <Text style={styles.audioLabel}>🎙️ Bản thu {m.player1_name}:</Text>
                        {React.createElement('audio', {
                          controls: true,
                          src: m.player1_audio_url,
                          style: { width: '100%', height: 32 },
                        })}
                      </View>
                    ) : null}

                    {m.player2_audio_url ? (
                      <View style={styles.audioBlock}>
                        <Text style={[styles.audioLabel, { color: '#FF007F' }]}>
                          🎙️ Bản thu {m.player2_name}:
                        </Text>
                        {React.createElement('audio', {
                          controls: true,
                          src: m.player2_audio_url,
                          style: { width: '100%', height: 32 },
                        })}
                      </View>
                    ) : null}

                    {m.ai_feedback?.vi ? (
                      <Text style={styles.aiNote}>🤖 {m.ai_feedback.vi}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05020D', padding: 16, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backBtn: { padding: 8, backgroundColor: '#0D0620', borderRadius: 8, borderWidth: 1, borderColor: '#00FFFF' },
  backText: { color: '#00FFFF', fontSize: 10, fontWeight: 'bold' },
  headerTitle: { color: '#FFD700', fontSize: 11.5, fontWeight: '900' },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, backgroundColor: '#0D0620', borderWidth: 1, borderColor: '#00FFFF', borderRadius: 8, padding: 10, color: '#FFF', fontSize: 11.5 },
  searchBtn: { backgroundColor: '#39FF14', paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' },
  searchBtnText: { color: '#000', fontSize: 10.5, fontWeight: '900' },

  profileCard: { backgroundColor: '#0D0620', borderRadius: 16, borderWidth: 2, borderColor: '#00FFFF', padding: 16, marginBottom: 16 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  playerName: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  playerSub: { color: '#AAAABB', fontSize: 10, marginTop: 2 },
  cefrBadgeBox: { backgroundColor: '#39FF14', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  cefrBadgeText: { color: '#000', fontSize: 12, fontWeight: '900' },

  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCell: { flex: 1, backgroundColor: '#130628', padding: 10, borderRadius: 10, alignItems: 'center' },
  kpiLabel: { color: '#8888AA', fontSize: 8, fontWeight: 'bold', marginBottom: 4 },
  kpiVal: { color: '#FFF', fontSize: 13.5, fontWeight: '900' },

  sectionTitle: { color: '#FFD700', fontSize: 11.5, fontWeight: '900', marginBottom: 10 },
  emptyText: { color: '#8888AA', fontSize: 11, textAlign: 'center', marginVertical: 20 },

  matchCard: { backgroundColor: '#0D0620', borderRadius: 12, borderWidth: 1, borderColor: '#332255', padding: 12, marginBottom: 10, gap: 6 },
  matchTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeTag: { color: '#00FFFF', fontSize: 9.5, fontWeight: '900' },
  outcomeTag: { fontSize: 10, fontWeight: '900' },
  matchPlayers: { color: '#FFF', fontSize: 11.5, fontWeight: 'bold' },
  matchPrompt: { color: '#C8E6FF', fontSize: 10, fontStyle: 'italic' },
  audioBlock: { backgroundColor: '#070212', padding: 8, borderRadius: 8, marginTop: 4 },
  audioLabel: { color: '#00FFFF', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  aiNote: { color: '#88FFBB', fontSize: 9.5, marginTop: 4 },
});