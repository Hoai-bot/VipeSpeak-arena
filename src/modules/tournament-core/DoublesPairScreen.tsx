// E:\DuAnAI\VipeSpeak-arena\src\modules\tournament-core\DoublesPairScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../utils/supabase';

export type PairBattleMode = 'ROLEPLAY' | 'RELAY';
export type CefrCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type VerifyTick = 'GOLD' | 'BLUE' | 'GREY';

interface PlayerSlot {
  studentCode: string;
  fullName: string;
  cefrLevel: CefrCode;
  peakScore: number;
  eloRating: number;
  verifyTick: VerifyTick;
}

interface Props {
  initialMode?: PairBattleMode;
  onBack: () => void;
  onLaunchTeamMatch: (payload: {
    mode: PairBattleMode;
    divisionCefr: CefrCode;
    teamCode: string;
    player1: PlayerSlot;
    player2: PlayerSlot;
  }) => void;
}

const CEFR_WEIGHT: Record<CefrCode, number> = {
  A1: 1.0,
  A2: 2.0,
  B1: 3.0,
  B2: 4.0,
  C1: 5.0,
  C2: 6.0,
};

const DIVISION_PRESETS: {
  id: CefrCode;
  label: string;
  maxCefrSum: number;
  maxScoreSum: number;
  desc: string;
}[] = [
  {
    id: 'A2',
    label: 'Bảng A2 (Sơ Cấp • Trần ≤ 4.0 bậc)',
    maxCefrSum: 4.0,
    maxScoreSum: 138,
    desc: 'Phù hợp cặp A2 + A2 hoặc A1 + B1 (Tổng điểm AI ≤ 138đ)',
  },
  {
    id: 'B1',
    label: 'Bảng B1 (Trung Cấp • Trần ≤ 6.0 bậc)',
    maxCefrSum: 6.0,
    maxScoreSum: 158,
    desc: 'Phù hợp cặp B1 + B1 hoặc A2 + B2 (Tổng điểm AI ≤ 158đ)',
  },
  {
    id: 'B2',
    label: 'Bảng B2 (Trung Cao Cấp • Trần ≤ 8.0 bậc)',
    maxCefrSum: 8.0,
    maxScoreSum: 176,
    desc: 'Phù hợp cặp B2 + B2 hoặc B1 + C1 (Tổng điểm AI ≤ 176đ)',
  },
  {
    id: 'C1',
    label: 'Bảng C1–C2 (Chuyên Sâu • Trần ≤ 12.0 bậc)',
    maxCefrSum: 12.0,
    maxScoreSum: 200,
    desc: 'Bảng Open học thuật không giới hạn trần CEFR (Tổng điểm AI ≤ 200đ)',
  },
];

function scoreToCefr(score: number): CefrCode {
  if (score >= 90) return 'C2';
  if (score >= 82) return 'C1';
  if (score >= 74) return 'B2';
  if (score >= 64) return 'B1';
  if (score >= 52) return 'A2';
  return 'A1';
}

export default function DoublesPairScreen({ initialMode = 'RELAY', onBack, onLaunchTeamMatch }: Props) {
  const [pairMode, setPairMode] = useState<PairBattleMode>(initialMode);
  const [divisionId, setDivisionId] = useState<CefrCode>('B1');
  const [allowLevelGap, setAllowLevelGap] = useState<boolean>(true); // Cho phép lệch tối đa 1 bậc (VD: A2 + B2 = B1+B1)

  const [p1, setP1] = useState<PlayerSlot>({
    studentCode: '268110',
    fullName: 'NVB',
    cefrLevel: 'B1',
    peakScore: 76,
    eloRating: 1240,
    verifyTick: 'BLUE',
  });

  const [p2, setP2] = useState<PlayerSlot>({
    studentCode: '',
    fullName: '',
    cefrLevel: 'B1',
    peakScore: 74,
    eloRating: 1200,
    verifyTick: 'BLUE',
  });

  const [loadingSlot, setLoadingSlot] = useState<1 | 2 | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string>('');
  const [validatedResult, setValidatedResult] = useState<{
    isValid: boolean;
    bannerType: 'OK' | 'WARN' | 'ERR';
    bannerText: string;
    cefrSum: number;
    maxCefrSum: number;
    scoreSum: number;
    maxScoreSum: number;
    teamCode: string;
  } | null>(null);

  const activePreset = DIVISION_PRESETS.find((d) => d.id === divisionId) || DIVISION_PRESETS[1];

  const handleLookupPlayer = async (slot: 1 | 2) => {
    const target = slot === 1 ? p1 : p2;
    const code = target.studentCode.trim().toUpperCase();
    if (!code) {
      setNoticeMsg(`⚠️ Vui lòng nhập MSSV hoặc SPEAK-ID của Thí sinh ${slot}!`);
      return;
    }

    setLoadingSlot(slot);
    setNoticeMsg('');
    try {
      if (!supabase) return;

      const cleanId = code.replace(/^SPEAK-/, '');
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .or(`student_code.eq.${cleanId},speak_id.eq.SPEAK-${cleanId}`)
        .maybeSingle();

      const { data: recentMatches } = await supabase
        .from('matches')
        .select('final_score, player1_score, var_status')
        .ilike('player1_name', `%${cleanId}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      let peak = target.peakScore;
      let tick: VerifyTick = 'GREY';

      if (recentMatches && recentMatches.length > 0) {
        const scores = recentMatches.map((m: any) => Number(m.final_score ?? m.player1_score ?? 0));
        peak = Math.max(...scores);
        const hasVar = recentMatches.some((m: any) => m.var_status === 'VAR_VERIFIED');
        tick = hasVar ? 'GOLD' : 'BLUE';
      } else if (prof) {
        peak = Number(prof.peak_score || 72);
        tick = 'BLUE';
      }

      const resolvedCefr = (prof?.cefr_level as CefrCode) || scoreToCefr(peak);
      const updatedSlot: PlayerSlot = {
        studentCode: cleanId,
        fullName: prof?.full_name || target.fullName || `Thí sinh ${cleanId}`,
        cefrLevel: resolvedCefr,
        peakScore: peak,
        eloRating: Number(prof?.elo_rating || 1200),
        verifyTick: tick,
      };

      if (slot === 1) setP1(updatedSlot);
      else setP2(updatedSlot);

      setNoticeMsg(
        prof || (recentMatches && recentMatches.length > 0)
          ? `✅ Đã tải hồ sơ ${updatedSlot.fullName} (${cleanId}) • Trình ${resolvedCefr} (${peak}đ)`
          : `ℹ️ Chưa thấy lịch sử thi trên Supabase cho ${cleanId}, đang dùng mức trình tạm tính.`
      );
    } finally {
      setLoadingSlot(null);
    }
  };

  const handleValidateTeam = () => {
    const w1 = CEFR_WEIGHT[p1.cefrLevel];
    const w2 = CEFR_WEIGHT[p2.cefrLevel];
    const cefrSum = Number((w1 + w2).toFixed(1));
    const scoreSum = Math.round((Number(p1.peakScore) || 0) + (Number(p2.peakScore) || 0));
    const levelGap = Math.abs(w1 - w2);
    const maxGapAllowed = allowLevelGap ? 1.0 : 0.0;

    const teamCode = `${pairMode === 'RELAY' ? 'RLY' : 'RPL'}-${divisionId}-${(p1.studentCode || 'P1').slice(-4)}${(p2.studentCode || 'P2').slice(-4)}`;

    if (!p1.studentCode.trim() || !p2.studentCode.trim()) {
      setValidatedResult({
        isValid: false,
        bannerType: 'ERR',
        bannerText: '❌ THIẾU THÔNG TIN: Vui lòng nhập đầy đủ MSSV của cả 2 thành viên trong cặp!',
        cefrSum,
        maxCefrSum: activePreset.maxCefrSum,
        scoreSum,
        maxScoreSum: activePreset.maxScoreSum,
        teamCode,
      });
      return;
    }

    if (p1.studentCode.trim().toUpperCase() === p2.studentCode.trim().toUpperCase()) {
      setValidatedResult({
        isValid: false,
        bannerType: 'ERR',
        bannerText: '❌ TRÙNG THÀNH VIÊN: Hai thành viên trong cặp phải là 2 thí sinh khác nhau!',
        cefrSum,
        maxCefrSum: activePreset.maxCefrSum,
        scoreSum,
        maxScoreSum: activePreset.maxScoreSum,
        teamCode,
      });
      return;
    }

    if (divisionId !== 'C1' && levelGap > maxGapAllowed) {
      setValidatedResult({
        isValid: false,
        bannerType: 'ERR',
        bannerText: `❌ LỆCH TRÌNH ĐỘ QUÁ MỨC (${p1.cefrLevel} + ${p2.cefrLevel}): Quy chế chống "gánh đội" chỉ cho phép chênh lệch tối đa ${maxGapAllowed} bậc CEFR!`,
        cefrSum,
        maxCefrSum: activePreset.maxCefrSum,
        scoreSum,
        maxScoreSum: activePreset.maxScoreSum,
        teamCode,
      });
      return;
    }

    if (cefrSum > activePreset.maxCefrSum || scoreSum > activePreset.maxScoreSum) {
      setValidatedResult({
        isValid: false,
        bannerType: 'ERR',
        bannerText: `❌ VƯỢT TRẦN BẢNG ${divisionId}: Tổng cặp (${cefrSum} bậc / ${scoreSum}đ) vượt giới hạn cho phép (${activePreset.maxCefrSum} bậc / ${activePreset.maxScoreSum}đ)!`,
        cefrSum,
        maxCefrSum: activePreset.maxCefrSum,
        scoreSum,
        maxScoreSum: activePreset.maxScoreSum,
        teamCode,
      });
      return;
    }

    if (p1.verifyTick === 'GREY' || p2.verifyTick === 'GREY') {
      setValidatedResult({
        isValid: true,
        bannerType: 'WARN',
        bannerText: `⚠️ ĐỦ ĐIỀU KIỆN ĐIỂM (${p1.cefrLevel} + ${p2.cefrLevel} = ${cefrSum} bậc) NHƯNG CÓ THÍ SINH TICK XÁM — Khuyến nghị làm 1 bài test CEFR Lab trước khi vào giải chính thức!`,
        cefrSum,
        maxCefrSum: activePreset.maxCefrSum,
        scoreSum,
        maxScoreSum: activePreset.maxScoreSum,
        teamCode,
      });
      return;
    }

    setValidatedResult({
      isValid: true,
      bannerType: 'OK',
      bannerText: `✅ HỢP LỆ CHUẨN CEFR (${p1.cefrLevel} + ${p2.cefrLevel}) — Cặp đôi đủ điều kiện thi đấu ${pairMode === 'RELAY' ? 'Tiếp Sức Relay 2vs2' : 'Nhập Vai Roleplay'} Bảng ${divisionId}!`,
      cefrSum,
      maxCefrSum: activePreset.maxCefrSum,
      scoreSum,
      maxScoreSum: activePreset.maxScoreSum,
      teamCode,
    });
  };

  const renderTickBadge = (tick: VerifyTick) => {
    if (tick === 'GOLD') {
      return (
        <View style={[styles.tickBadge, { borderColor: '#FACC15', backgroundColor: 'rgba(250,204,21,0.16)' }]}>
          <Text style={[styles.tickText, { color: '#FDE047' }]}>🟡 VAR VERIFIED</Text>
        </View>
      );
    }
    if (tick === 'BLUE') {
      return (
        <View style={[styles.tickBadge, { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.16)' }]}>
          <Text style={[styles.tickText, { color: '#7DD3FC' }]}>🔵 AI VERIFIED</Text>
        </View>
      );
    }
    return (
      <View style={[styles.tickBadge, { borderColor: '#94A3B8', backgroundColor: 'rgba(148,163,184,0.16)' }]}>
        <Text style={[styles.tickText, { color: '#CBD5E1' }]}>⚪ CHƯA XÁC THỰC</Text>
      </View>
    );
  };

  const renderPlayerCard = (slotNum: 1 | 2, player: PlayerSlot, setPlayer: (val: PlayerSlot) => void) => (
    <View style={styles.playerBox}>
      <View style={styles.playerHeader}>
        <Text style={styles.playerTitle}>
          {slotNum === 1 ? '👤 THÀNH VIÊN 1 (ANCHOR)' : '👤 THÀNH VIÊN 2 (PARTNER)'}
        </Text>
        {renderTickBadge(player.verifyTick)}
      </View>

      <Text style={styles.label}>Mã MSSV / SPEAK-ID:</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="VD: 268110..."
          placeholderTextColor="#64748B"
          autoCapitalize="characters"
          value={player.studentCode}
          onChangeText={(txt) => setPlayer({ ...player, studentCode: txt })}
        />
        <TouchableOpacity
          style={styles.lookupBtn}
          disabled={loadingSlot === slotNum}
          onPress={() => handleLookupPlayer(slotNum)}
        >
          {loadingSlot === slotNum ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <Text style={styles.lookupBtnText}>🔍 Tra Cứu</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.twoCol}>
        <View style={{ flex: 1, minWidth: 130 }}>
          <Text style={styles.label}>Họ và tên:</Text>
          <TextInput
            style={styles.input}
            placeholder="Tên thí sinh..."
            placeholderTextColor="#64748B"
            value={player.fullName}
            onChangeText={(txt) => setPlayer({ ...player, fullName: txt })}
          />
        </View>
        <View style={{ width: 95 }}>
          <Text style={styles.label}>Điểm Đỉnh AI:</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(player.peakScore)}
            onChangeText={(txt) => {
              const num = Number(txt) || 0;
              setPlayer({ ...player, peakScore: num, cefrLevel: scoreToCefr(num) });
            }}
          />
        </View>
      </View>

      <Text style={styles.label}>Bậc Năng Lực CEFR (Khung Châu Âu):</Text>
      <View style={styles.cefrRow}>
        {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CefrCode[]).map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[styles.cefrChip, player.cefrLevel === lvl && styles.cefrChipActive]}
            onPress={() => setPlayer({ ...player, cefrLevel: lvl })}
          >
            <Text style={[styles.cefrChipText, player.cefrLevel === lvl && styles.cefrChipTextActive]}>
              {lvl} ({CEFR_WEIGHT[lvl].toFixed(1)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.innerMax}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backText}>← TRANG CHỦ</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🤝 GHÉP CẶP ĐẤU ĐÔI & TIẾP SỨC CHUẨN CEFR</Text>
          <View style={{ width: 85 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚖️ THẨM ĐỊNH ĐỘI HÌNH 2VS2 (ROLEPLAY & RELAY)</Text>
            <Text style={styles.cardSub}>
              Hệ thống đối chiếu bậc CEFR (A1–C2) và điểm AI thực tế của 2 thành viên để ghép cặp cân bằng (VD: cặp B1 + B1 đấu với cặp B1 + B1 khác), ngăn chặn tình trạng lệch trình quá mức.
            </Text>

            {/* 1. CHỌN THỂ THỨC GHÉP CẶP: ROLEPLAY HOẶC RELAY */}
            <Text style={styles.label}>1. Chọn Thể Thức Thi Đấu Cặp Đôi:</Text>
            <View style={styles.modeSwitchRow}>
              <TouchableOpacity
                style={[styles.modeCard, pairMode === 'RELAY' && styles.modeCardActiveGreen]}
                onPress={() => setPairMode('RELAY')}
              >
                <Text style={styles.modeTitle}>🏃 TIẾP SỨC ĐỒNG ĐỘI (RELAY 2VS2)</Text>
                <Text style={styles.modeDesc}>
                  2 thí sinh nối tiếp lập luận theo chuỗi thời gian, cộng hưởng điểm mạch lạc & từ vựng.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeCard, pairMode === 'ROLEPLAY' && styles.modeCardActiveSky]}
                onPress={() => setPairMode('ROLEPLAY')}
              >
                <Text style={styles.modeTitle}>🎭 NHẬP VAI CẶP ĐÔI (ROLEPLAY)</Text>
                <Text style={styles.modeDesc}>
                  2 thí sinh đối thoại xử lý tình huống thực tế (Phỏng vấn, Đàm phán, Dịch vụ).
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. CHỌN BẢNG ĐẤU & TRẦN ĐIỂM CEFR */}
            <Text style={[styles.label, { marginTop: 12 }]}>2. Chọn Bảng Đấu & Trần Điểm CEFR:</Text>
            <View style={styles.presetGrid}>
              {DIVISION_PRESETS.map((div) => (
                <TouchableOpacity
                  key={div.id}
                  style={[styles.presetBtn, divisionId === div.id && styles.presetBtnActive]}
                  onPress={() => setDivisionId(div.id)}
                >
                  <Text style={[styles.presetTitle, divisionId === div.id && { color: '#020617' }]}>
                    {div.label}
                  </Text>
                  <Text style={[styles.presetSub, divisionId === div.id && { color: '#0F172A' }]}>
                    {div.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tùy chọn biên độ lệch trình nội bộ */}
            <TouchableOpacity
              style={styles.toleranceToggle}
              onPress={() => setAllowLevelGap((v) => !v)}
            >
              <Text style={styles.toleranceText}>
                {allowLevelGap
                  ? '☑️ Cho phép ghép lệch tối đa 1 bậc CEFR (VD: A2 + B2 tương đương cặp B1 + B1)'
                  : '🔒 Bắt buộc đồng hạng CEFR (Chỉ ghép B1 + B1, B2 + B2...)'}
              </Text>
            </TouchableOpacity>

            {/* 3. KHUNG NHẬP THÔNG TIN 2 THÀNH VIÊN */}
            <View style={styles.playersGrid}>
              {renderPlayerCard(1, p1, setP1)}
              {renderPlayerCard(2, p2, setP2)}
            </View>

            {!!noticeMsg && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{noticeMsg}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.validateBtn} onPress={handleValidateTeam}>
              <Text style={styles.validateBtnText}>
                ⚡ KIỂM TRA TRẦN CEFR & XÁC NHẬN ĐỘI HÌNH {pairMode}
              </Text>
            </TouchableOpacity>

            {/* KẾT QUẢ THẨM ĐỊNH CẶP ĐẤU */}
            {validatedResult && (
              <View style={styles.resultBox}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>📊 KẾT QUẢ THẨM ĐỊNH CẶP ĐẤU</Text>
                  <Text style={styles.teamCodeTag}>MÃ ĐỘI: {validatedResult.teamCode}</Text>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>TỔNG BẬC CEFR CẶP</Text>
                    <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
                      {validatedResult.cefrSum.toFixed(1)} / {validatedResult.maxCefrSum.toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>TỔNG ĐIỂM AI CẶP</Text>
                    <Text style={[styles.metricValue, { color: '#FACC15' }]}>
                      {validatedResult.scoreSum} / {validatedResult.maxScoreSum}đ
                    </Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>ĐỘI HÌNH</Text>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                      {p1.cefrLevel} + {p2.cefrLevel}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBanner,
                    validatedResult.bannerType === 'OK'
                      ? styles.bannerOk
                      : validatedResult.bannerType === 'WARN'
                      ? styles.bannerWarn
                      : styles.bannerErr,
                  ]}
                >
                  <Text style={styles.bannerText}>{validatedResult.bannerText}</Text>
                </View>

                {validatedResult.isValid && (
                  <TouchableOpacity
                    style={styles.launchMatchBtn}
                    onPress={() =>
                      onLaunchTeamMatch({
                        mode: pairMode,
                        divisionCefr: divisionId,
                        teamCode: validatedResult.teamCode,
                        player1: p1,
                        player2: p2,
                      })
                    }
                  >
                    <Text style={styles.launchMatchBtnText}>
                      ⚔️ ĐƯA CẶP ĐÔI VÀO SÀN ĐẤU {pairMode} NGAY ➔
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120', padding: 16 },
  innerMax: { maxWidth: 1080, width: '100%', alignSelf: 'center', flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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

  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  cardTitle: { color: '#FACC15', fontSize: 15, fontWeight: '900' },
  cardSub: { color: '#94A3B8', fontSize: 12.5, lineHeight: 18, marginBottom: 4 },
  label: { color: '#7DD3FC', fontSize: 11.5, fontWeight: '800', marginBottom: 4 },

  modeSwitchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeCard: {
    flexGrow: 1,
    flexBasis: 280,
    backgroundColor: '#0B1120',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  modeCardActiveGreen: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.12)' },
  modeCardActiveSky: { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.12)' },
  modeTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  modeDesc: { color: '#94A3B8', fontSize: 11.5, lineHeight: 16 },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  presetBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  presetTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  presetSub: { color: '#94A3B8', fontSize: 10.5 },

  toleranceToggle: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 9,
    padding: 10,
  },
  toleranceText: { color: '#7DD3FC', fontSize: 11.5, fontWeight: '700' },

  playersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  playerBox: {
    flexGrow: 1,
    flexBasis: 340,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playerTitle: { color: '#FACC15', fontSize: 12.5, fontWeight: '900' },
  tickBadge: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  tickText: { fontSize: 10, fontWeight: '900' },

  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12.5,
  },
  lookupBtn: {
    backgroundColor: 'rgba(56,189,248,0.16)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 8,
    paddingHorizontal: 11,
    justifyContent: 'center',
  },
  lookupBtnText: { color: '#38BDF8', fontSize: 11.5, fontWeight: '800' },

  cefrRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  cefrChip: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cefrChipActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  cefrChipText: { color: '#94A3B8', fontSize: 10.5, fontWeight: '800' },
  cefrChipTextActive: { color: '#020617', fontWeight: '900' },

  noticeBox: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    borderRadius: 9,
    padding: 9,
  },
  noticeText: { color: '#7DD3FC', fontSize: 12, textAlign: 'center', fontWeight: '700' },

  validateBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  validateBtnText: { color: '#020617', fontSize: 13, fontWeight: '900' },

  resultBox: {
    backgroundColor: '#0B1120',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  resultTitle: { color: '#FACC15', fontSize: 13.5, fontWeight: '900' },
  teamCodeTag: { color: '#38BDF8', fontSize: 11.5, fontWeight: '800' },

  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCell: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
  metricValue: { fontSize: 18, fontWeight: '900', marginTop: 2 },

  statusBanner: { padding: 11, borderRadius: 10, borderWidth: 1 },
  bannerOk: { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: '#10B981' },
  bannerWarn: { backgroundColor: 'rgba(250,204,21,0.16)', borderColor: '#FACC15' },
  bannerErr: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: '#EF4444' },
  bannerText: { color: '#F8FAFC', fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 18 },

  launchMatchBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  launchMatchBtnText: { color: '#020617', fontSize: 12.5, fontWeight: '900' },
});