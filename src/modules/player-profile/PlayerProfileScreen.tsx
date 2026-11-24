// E:\DuAnAI\VipeSpeak-arena\src\modules\player-profile\PlayerProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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

interface Props {
  initialStudentCode?: string;
  onBack: () => void;
  onNavigateEvents?: () => void;
}

function derivePeakFloorLevel(peakScore: number, fallbackCefr: string): string {
  if (peakScore >= 92) return 'C2 (Khóa sàn C1+)';
  if (peakScore >= 82) return 'C1 (Khóa sàn B2+)';
  if (peakScore >= 70) return 'B2 (Khóa sàn B1+)';
  if (peakScore >= 56) return 'B1 (Khóa sàn A2+)';
  return fallbackCefr || 'B1';
}

// Nén ảnh Avatar thành vuông 200x200px trên trình duyệt
function compressAvatarToBlob(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx?.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, dataUrl });
            else reject(new Error('Không thể nén ảnh đại diện'));
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = reject;
      img.src = ev.target?.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PlayerProfileScreen({
  initialStudentCode = '',
  onBack,
  onNavigateEvents,
}: Props) {
  const [searchCode, setSearchCode] = useState<string>(initialStudentCode);
  const [profileData, setProfileData] = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Avatar & Upload state
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [avatarStatusMsg, setAvatarStatusMsg] = useState<string>('');

  const avatarCameraRef = useRef<any>(null);
  const avatarFileRef = useRef<any>(null);

  const loadPlayerProfileAndMatches = async (codeToLoad: string) => {
    const cleanCode = codeToLoad.trim().toUpperCase();
    if (!cleanCode || !supabase) return;

    setLoading(true);
    setAvatarStatusMsg('');
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

      // Tải Avatar đã lưu của thí sinh từ Supabase Storage (submissions/avatars/<MSSV>.jpg)
      const { data: pubUrlObj } = supabase.storage
        .from('submissions')
        .getPublicUrl(`avatars/${cleanCode}.jpg`);
      if (pubUrlObj?.publicUrl) {
        setAvatarUrl(`${pubUrlObj.publicUrl}?t=${Date.now()}`);
      } else if (profRes.data?.avatar_url) {
        setAvatarUrl(profRes.data.avatar_url);
      } else {
        setAvatarUrl('');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialStudentCode) {
      loadPlayerProfileAndMatches(initialStudentCode);
    }
  }, [initialStudentCode]);

  const handleAvatarSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const cleanCode = searchCode.trim().toUpperCase();
    if (!cleanCode) {
      setAvatarStatusMsg('⚠️ Vui lòng nhập MSSV vào ô tra cứu trước khi tải ảnh đại diện!');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarStatusMsg('⏳ Đang nén và lưu ảnh đại diện SPEAK-ID...');
    try {
      const { blob, dataUrl } = await compressAvatarToBlob(fileList[0]);
      setAvatarUrl(dataUrl);

      if (supabase) {
        const storagePath = `avatars/${cleanCode}.jpg`;
        const { error: upErr } = await supabase.storage.from('submissions').upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

        if (!upErr) {
          const { data: urlObj } = supabase.storage.from('submissions').getPublicUrl(storagePath);
          if (urlObj?.publicUrl) {
            setAvatarUrl(`${urlObj.publicUrl}?t=${Date.now()}`);
          }
        }
      }
      setAvatarStatusMsg(`✅ Đã cập nhật ảnh đại diện cho SPEAK-${cleanCode}!`);
    } catch (err: any) {
      setAvatarStatusMsg(`❌ Lỗi tải ảnh đại diện: ${err?.message || 'Thử lại sau'}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const cleanSearch = searchCode.trim().toUpperCase();
  const totalMatches = matchHistory.length;
  const winsCount = matchHistory.filter(
    (m) => (m.winner_code || '').toUpperCase() === cleanSearch
  ).length;
  const winRate = totalMatches > 0 ? Math.round((winsCount / totalMatches) * 100) : 0;

  const allPlayerScores = matchHistory.map((m) => {
    const isP2 = (m.player2_code || '').toUpperCase() === cleanSearch;
    return Number(isP2 ? m.player2_score ?? m.final_score ?? 0 : m.player1_score ?? m.final_score ?? 0);
  });
  const peakScore = allPlayerScores.length > 0 ? Math.max(...allPlayerScores) : 0;
  const hasVarVerified = matchHistory.some((m) => m.live_status === 'VAR_VERIFIED');
  const hasDebateMatch = matchHistory.some((m) => m.mode === 'DEBATE');
  const speakIdBadge = cleanSearch ? `SPEAK-${cleanSearch}` : 'SPEAK-ID-2026';

  const displayName =
    profileData?.full_name || matchHistory[0]?.player1_name || cleanSearch || 'Thí sinh VipeSpeak Arena';
  const fallbackInitial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.innerMax}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backText}>← TRANG CHỦ</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🪪 HỘ CHIẾU NĂNG LỰC SPEAK-ID & LỊCH SỬ</Text>
          {onNavigateEvents ? (
            <TouchableOpacity style={styles.eventsLinkBtn} onPress={onNavigateEvents}>
              <Text style={styles.eventsLinkText}>📅 Sự Kiện & Ảnh Giải</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.verifiedTag}>
              <Text style={styles.verifiedTagText}>CEFR FLOOR LOCK</Text>
            </View>
          )}
        </View>

        {/* Thanh tra cứu MSSV */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập Mã số sinh viên (VD: 2685014)..."
            placeholderTextColor="#64748B"
            autoCapitalize="characters"
            value={searchCode}
            onChangeText={setSearchCode}
            onSubmitEditing={() => loadPlayerProfileAndMatches(searchCode)}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => loadPlayerProfileAndMatches(searchCode)}
          >
            <Text style={styles.searchBtnText}>🔍 TRA CỨU HỘ CHIẾU</Text>
          </TouchableOpacity>
        </View>

        {avatarStatusMsg ? (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText}>{avatarStatusMsg}</Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
          {loading ? (
            <ActivityIndicator size="large" color="#10B981" style={{ marginVertical: 30 }} />
          ) : (
            <>
              {/* THẺ HỘ CHIẾU SPEAK-ID CÓ AVATAR CHỤP CAMERA / TẢI ẢNH */}
              <View style={styles.profileCard}>
                <View style={styles.profileTop}>
                  <View style={styles.identityLeftRow}>
                    {/* Khung Avatar tròn + Nút Chụp Camera / Tải Ảnh */}
                    <View style={styles.avatarColumn}>
                      <View style={styles.avatarRing}>
                        {avatarUrl && Platform.OS === 'web' ? (
                          // @ts-ignore
                          <img
                            src={avatarUrl}
                            alt="Avatar SPEAK-ID"
                            onError={() => setAvatarUrl('')}
                            style={{
                              width: 78,
                              height: 78,
                              borderRadius: 39,
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <Text style={styles.avatarFallbackText}>{fallbackInitial}</Text>
                          </View>
                        )}
                      </View>

                      {Platform.OS === 'web' && (
                        <>
                          {/* @ts-ignore - Chụp selfie qua camera trước trên điện thoại */}
                          <input
                            ref={avatarCameraRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            style={{ display: 'none' }}
                            onChange={(e: any) => handleAvatarSelected(e.target.files)}
                          />
                          {/* @ts-ignore - Tải ảnh từ thư viện máy */}
                          <input
                            ref={avatarFileRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e: any) => handleAvatarSelected(e.target.files)}
                          />
                        </>
                      )}

                      <View style={styles.avatarBtnPair}>
                        <TouchableOpacity
                          style={styles.avatarMiniBtn}
                          disabled={isUploadingAvatar}
                          onPress={() => avatarCameraRef.current?.click()}
                        >
                          <Text style={styles.avatarMiniBtnText}>📷 Chụp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.avatarMiniBtnSky}
                          disabled={isUploadingAvatar}
                          onPress={() => avatarFileRef.current?.click()}
                        >
                          <Text style={styles.avatarMiniBtnSkyText}>🖼️ Tải ảnh</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Thông tin định danh */}
                    <View style={{ flex: 1 }}>
                      <View style={styles.idPillRow}>
                        <View style={styles.speakIdPill}>
                          <Text style={styles.speakIdPillText}>{speakIdBadge}</Text>
                        </View>
                        {hasVarVerified && (
                          <View style={styles.varPill}>
                            <Text style={styles.varPillText}>🛡️ VAR VERIFIED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.playerName}>{displayName}</Text>
                      <Text style={styles.playerSub}>
                        MSSV: {cleanSearch || 'N/A'} • 🏅 {profileData?.badge_title || 'Arena Competitor'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cefrBadgeBox}>
                    <Text style={styles.cefrBadgeLabel}>CHUẨN CEFR</Text>
                    <Text style={styles.cefrBadgeText}>{profileData?.current_cefr || 'B1'}</Text>
                  </View>
                </View>

                {/* Khóa Sàn Năng Lực (Peak CEFR Floor) */}
                <View style={styles.floorLockBar}>
                  <Text style={styles.floorLockText}>
                    🔒 Đỉnh năng lực: <Text style={{ color: '#10B981', fontWeight: '900' }}>{peakScore}/100đ</Text>  •  Mức sàn bảo vệ:{' '}
                    <Text style={{ color: '#7DD3FC', fontWeight: '900' }}>
                      {derivePeakFloorLevel(peakScore, profileData?.current_cefr || 'B1')}
                    </Text>
                  </Text>
                </View>

                <View style={styles.kpiRow}>
                  <View style={styles.kpiCell}>
                    <Text style={styles.kpiLabel}>ĐIỂM ELO</Text>
                    <Text style={[styles.kpiVal, { color: '#10B981' }]}>{profileData?.elo_rating || 1000}</Text>
                  </View>
                  <View style={styles.kpiCell}>
                    <Text style={styles.kpiLabel}>TỶ LỆ THẮNG</Text>
                    <Text style={[styles.kpiVal, { color: '#38BDF8' }]}>{winRate}%</Text>
                  </View>
                  <View style={styles.kpiCell}>
                    <Text style={styles.kpiLabel}>SỐ TRẬN</Text>
                    <Text style={styles.kpiVal}>{totalMatches}</Text>
                  </View>
                  <View style={styles.kpiCell}>
                    <Text style={styles.kpiLabel}>TỐC ĐỘ TB</Text>
                    <Text style={[styles.kpiVal, { color: '#F59E0B' }]}>{profileData?.avg_wpm || 120} WPM</Text>
                  </View>
                </View>

                {/* Huy hiệu kỹ năng đạt được */}
                <View style={styles.badgesRow}>
                  <View style={[styles.skillBadge, peakScore >= 80 && styles.skillBadgeUnlocked]}>
                    <Text style={styles.skillBadgeText}>
                      {peakScore >= 80 ? '✅ Chuẩn Âm Vị IPA' : '🔒 Chuẩn Âm Vị IPA (≥80đ)'}
                    </Text>
                  </View>
                  <View style={[styles.skillBadge, (profileData?.avg_wpm || 120) >= 115 && styles.skillBadgeUnlocked]}>
                    <Text style={styles.skillBadgeText}>
                      {(profileData?.avg_wpm || 120) >= 115 ? '✅ Phản Xạ Tự Nhiên' : '🔒 Phản Xạ (≥115 WPM)'}
                    </Text>
                  </View>
                  <View style={[styles.skillBadge, hasDebateMatch && styles.skillBadgeUnlocked]}>
                    <Text style={styles.skillBadgeText}>
                      {hasDebateMatch ? '✅ Nhà Tranh Biện Debate' : '🔒 Nhà Tranh Biện Debate'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* DANH SÁCH LỊCH SỬ TRẬN ĐẤU */}
              <Text style={styles.sectionTitle}>
                ⚔️ LỊCH SỬ THI ĐẤU & BẢN THU AUDIO REPLAY ({matchHistory.length})
              </Text>

              {matchHistory.length === 0 ? (
                <Text style={styles.emptyText}>
                  Chưa tìm thấy lịch sử trận đấu cho MSSV này. Hãy nhập MSSV của bạn và bấm Tra cứu!
                </Text>
              ) : (
                matchHistory.map((m) => {
                  const isWinner = (m.winner_code || '').toUpperCase() === cleanSearch;
                  const isVarDone = m.live_status === 'VAR_VERIFIED';
                  return (
                    <View key={m.id} style={styles.matchCard}>
                      <View style={styles.matchTopRow}>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <Text style={styles.modeTag}>
                            {m.mode} • CEFR {m.cefr_level}
                          </Text>
                          {isVarDone && <Text style={styles.varMiniBadge}>🛡️ VAR</Text>}
                        </View>
                        <Text style={[styles.outcomeTag, { color: isWinner ? '#10B981' : '#F59E0B' }]}>
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

                      {m.player1_audio_url ? (
                        <View style={styles.audioBlock}>
                          <Text style={styles.audioLabel}>🎙️ Bản thu {m.player1_name}:</Text>
                          {React.createElement('audio', {
                            controls: true,
                            src: m.player1_audio_url,
                            style: { width: '100%', height: 34 },
                          })}
                        </View>
                      ) : null}

                      {m.player2_audio_url ? (
                        <View style={styles.audioBlock}>
                          <Text style={[styles.audioLabel, { color: '#A78BFA' }]}>
                            🎙️ Bản thu {m.player2_name}:
                          </Text>
                          {React.createElement('audio', {
                            controls: true,
                            src: m.player2_audio_url,
                            style: { width: '100%', height: 34 },
                          })}
                        </View>
                      ) : null}

                      {m.ai_feedback?.vi ? (
                        <Text style={styles.aiNote}>💬 {m.ai_feedback.vi}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120', padding: 16 },
  innerMax: { maxWidth: 960, width: '100%', alignSelf: 'center', flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  backText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', textAlign: 'center', flex: 1 },
  eventsLinkBtn: {
    backgroundColor: 'rgba(167,139,250,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  eventsLinkText: { color: '#DDD6FE', fontSize: 11, fontWeight: '800' },
  verifiedTag: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  verifiedTagText: { color: '#7DD3FC', fontSize: 10, fontWeight: '800' },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  searchInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 13,
  },
  searchBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#020617', fontSize: 12, fontWeight: '900' },

  toastBanner: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.45)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  toastText: { color: '#6EE7B7', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  profileCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.4)',
    padding: 18,
    marginBottom: 18,
    gap: 12,
  },
  profileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  identityLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 260,
  },
  avatarColumn: { alignItems: 'center', gap: 6 },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    borderColor: '#10B981',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1120',
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { color: '#10B981', fontSize: 28, fontWeight: '900' },
  avatarBtnPair: { flexDirection: 'row', gap: 5 },
  avatarMiniBtn: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.45)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  avatarMiniBtnText: { color: '#6EE7B7', fontSize: 10, fontWeight: '800' },
  avatarMiniBtnSky: {
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.45)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  avatarMiniBtnSkyText: { color: '#7DD3FC', fontSize: 10, fontWeight: '800' },

  idPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  speakIdPill: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  speakIdPillText: { color: '#6EE7B7', fontSize: 11, fontWeight: '900' },
  varPill: {
    backgroundColor: 'rgba(56,189,248,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  varPillText: { color: '#7DD3FC', fontSize: 11, fontWeight: '900' },
  playerName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  playerSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  cefrBadgeBox: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  cefrBadgeLabel: { color: '#020617', fontSize: 9, fontWeight: '900' },
  cefrBadgeText: { color: '#020617', fontSize: 18, fontWeight: '900' },

  floorLockBar: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  floorLockText: { color: '#CBD5E1', fontSize: 12 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCell: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  kpiLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  kpiVal: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillBadge: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skillBadgeUnlocked: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  skillBadgeText: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },

  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginBottom: 12 },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginVertical: 24 },

  matchCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    marginBottom: 12,
    gap: 8,
  },
  matchTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  modeTag: { color: '#7DD3FC', fontSize: 11.5, fontWeight: '900' },
  varMiniBadge: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    color: '#7DD3FC',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  outcomeTag: { fontSize: 11.5, fontWeight: '900' },
  matchPlayers: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  matchPrompt: { color: '#CBD5E1', fontSize: 12, fontStyle: 'italic' },
  audioBlock: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    borderRadius: 10,
    marginTop: 2,
  },
  audioLabel: { color: '#6EE7B7', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  aiNote: { color: '#6EE7B7', fontSize: 11.5, lineHeight: 17 },
});