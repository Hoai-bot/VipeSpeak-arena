// E:\DuAnAI\VipeSpeak-arena\src\components\EcosystemLanding.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Tự động đọc biến môi trường chuẩn Expo / Vite / Vercel
const getEnvVar = (keys: string[]): string => {
  for (const k of keys) {
    const fromProcess = typeof process !== 'undefined' && process.env ? process.env[k] : '';
    if (fromProcess) return String(fromProcess).trim();
    const fromMeta =
      typeof import.meta !== 'undefined' && (import.meta as any).env
        ? (import.meta as any).env[k]
        : '';
    if (fromMeta) return String(fromMeta).trim();
  }
  return '';
};

const supabaseUrl = getEnvVar(['EXPO_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseAnonKey = getEnvVar(['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type ArenaBattleMode = 'SOLO' | 'RELAY' | 'ROLEPLAY' | 'DEBATE';

export interface SubmissionRecord {
  id: string;
  student_name: string;
  student_code: string;
  mode: string;
  cefr_level: string;
  score: number;
  manual_score?: number | null;
  transcript: string;
  feedback: string;
  audio_url?: string | null;
  class_name?: string | null;
  created_at: string;
}

export interface EcosystemLandingProps {
  onSelectBattleMode: (mode: ArenaBattleMode) => void;
  onNavigateHub: () => void;
  onNavigateCefrTest: () => void;
  onNavigateProfile: (studentCode?: string) => void;
}

const DEMO_RECORDS: SubmissionRecord[] = [
  {
    id: 'demo-1',
    student_name: 'NGUYỄN MINH KHANG',
    student_code: '2685014',
    mode: 'STATION_2_ROLEPLAY',
    cefr_level: 'B1',
    score: 88,
    manual_score: 90,
    transcript:
      'What did you use to do when you were younger? I used to play badminton every afternoon, but now I go jogging in the park.',
    feedback:
      '[Phát âm: 91 | Ngữ điệu: 84 | Ngữ pháp: 95 | Nội dung: 94] 🌟 Xuất sắc! Diễn đạt tự nhiên, phân biệt chuẩn "used to" và hiện tại đơn.',
    audio_url: null,
    class_name: '[CDTAK4] Trạm 2: ROLEPLAY (B1)',
    created_at: '2026-11-23T09:24:38.636Z',
  },
  {
    id: 'demo-2',
    student_name: 'NGUYỄN MINH KHANG',
    student_code: '2685014',
    mode: 'STATION_2_DEBATE',
    cefr_level: 'B2',
    score: 86,
    manual_score: null,
    transcript:
      'However, I strongly believe that online learning provides greater flexibility for students, whereas traditional classrooms require fixed commuting hours.',
    feedback:
      '[Phát âm: 88 | Ngữ điệu: 84 | Ngữ pháp: 87 | Nội dung: 90] 🚀 Tranh biện sắc bén, dùng từ nối tương phản học thuật chuẩn xác.',
    audio_url: null,
    class_name: '[CDTAK4] Trạm 2: DEBATE (B2)',
    created_at: '2026-11-22T14:15:10.000Z',
  },
];

export default function EcosystemLanding({
  onSelectBattleMode,
  onNavigateHub,
  onNavigateCefrTest,
  onNavigateProfile,
}: EcosystemLandingProps) {
  const [lang, setLang] = useState<'VI' | 'EN'>('VI');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [records, setRecords] = useState<SubmissionRecord[]>(DEMO_RECORDS);
  const [isDemo, setIsDemo] = useState(true);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  const isVi = lang === 'VI';

  const battleModes: Array<{
    mode: ArenaBattleMode;
    badge: string;
    icon: string;
    titleVi: string;
    titleEn: string;
    descVi: string;
    descEn: string;
    auditVi: string;
    auditEn: string;
    borderColor: string;
    accentColor: string;
  }> = [
    {
      mode: 'SOLO',
      badge: '1 VS AI • CEFR',
      icon: '🎯',
      titleVi: 'ĐẤU TRƯỜNG SOLO',
      titleEn: 'SOLO ARENA',
      descVi:
        'Độc thoại phản xạ cá nhân theo tình huống ngẫu nhiên A1–C2. Chấm âm vị IPA, tốc độ WPM và loại trừ lặp đề.',
      descEn:
        'Individual reflex monologue across CEFR A1–C2 prompts with IPA phoneme audit and net word count.',
      auditVi: 'Kiểm định: IPA • Net Words • WPM',
      auditEn: 'Audit: IPA • Net Words • WPM',
      borderColor: '#10B981',
      accentColor: '#10B981',
    },
    {
      mode: 'RELAY',
      badge: 'TEAM • RELAY',
      icon: '⚡',
      titleVi: 'TIẾP SỨC RELAY',
      titleEn: 'RELAY ARENA',
      descVi:
        'Thi đấu tiếp sức đồng đội: mỗi thành viên nối tiếp luận điểm mới trên cùng chủ đề mà không trùng lặp ý trước.',
      descEn:
        'Team relay challenge where each speaker builds new supporting ideas sequentially without repetition.',
      auditVi: 'Kiểm định: Mạch liên kết • Đa dạng từ vựng',
      auditEn: 'Audit: Idea Continuity • Lexical TTR',
      borderColor: '#38BDF8',
      accentColor: '#38BDF8',
    },
    {
      mode: 'ROLEPLAY',
      badge: 'PAIR • DIALOGUE',
      icon: '🤝',
      titleVi: 'NHẬP VAI ROLEPLAY',
      titleEn: 'ROLEPLAY ARENA',
      descVi:
        'Đối thoại cặp đôi hỏi – đáp tự nhiên theo kịch bản giao tiếp thực tế (quá khứ, nghề nghiệp, dịch vụ, công sở).',
      descEn:
        'Interactive pair dialogue in real-world scenarios (past habits, career, customer service, workplace).',
      auditVi: 'Kiểm định: Phản xạ hỏi–đáp • Ngữ pháp hội thoại',
      auditEn: 'Audit: Turn-Taking • Conversational Grammar',
      borderColor: '#A78BFA',
      accentColor: '#A78BFA',
    },
    {
      mode: 'DEBATE',
      badge: 'PRO VS CON • B2-C2',
      icon: '⚖️',
      titleVi: 'TRANH BIỆN DEBATE',
      titleEn: 'DEBATE ARENA',
      descVi:
        'Đấu trí phản biện 2 phe Ủng hộ (PRO) & Phản đối (CON). AI chấm điểm từ nối học thuật và cấu trúc câu phức.',
      descEn:
        'Competitive PRO vs. CON argumentation rewarding academic connectors and complex syntactic structures.',
      auditVi: 'Kiểm định: Lập luận • Cấu trúc nâng cao',
      auditEn: 'Audit: Argumentation • Advanced Clauses',
      borderColor: '#F59E0B',
      accentColor: '#F59E0B',
    },
  ];

  const handleLookup = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setErrorMsg(isVi ? 'Vui lòng nhập MSSV hoặc Họ tên sinh viên để tra cứu.' : 'Please enter Student ID or Name.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      if (!supabase) {
        throw new Error(
          isVi
            ? 'Chưa tìm thấy biến kết nối Supabase trong môi trường chạy hiện tại.'
            : 'Supabase environment variables are not configured.'
        );
      }

      const { data, error } = await supabase
        .from('submissions')
        .select('id, student_name, student_code, mode, cefr_level, score, manual_score, transcript, feedback, audio_url, class_name, created_at')
        .or(`student_code.ilike.%${q}%,student_name.ilike.%${q}%`)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      if (!data || data.length === 0) {
        setErrorMsg(
          isVi
            ? `Không tìm thấy hồ sơ bài nói nào khớp với "${q}". Hãy thử lại bằng MSSV chính xác.`
            : `No speaking records found matching "${q}".`
        );
        setRecords([]);
        setIsDemo(false);
      } else {
        setRecords(data as SubmissionRecord[]);
        setIsDemo(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isVi ? 'Lỗi truy vấn Supabase.' : 'Supabase query error.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = () => {
    setSearchQuery('2685014');
    setErrorMsg('');
    setRecords(DEMO_RECORDS);
    setIsDemo(true);
  };

  const scores = records.map((r) => (typeof r.manual_score === 'number' ? r.manual_score : r.score));
  const latestScore = scores.length > 0 ? scores[0] : 0;
  const peakScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const primaryStudent = records[0];
  const speakIdCode =
    primaryStudent?.student_code && primaryStudent.student_code !== 'GUEST'
      ? `SPEAK-${primaryStudent.student_code.toUpperCase()}`
      : 'SPEAK-GUEST-2026';

  const formatModeLabel = (m: string) => {
    if (m.includes('DEBATE')) return '⚖️ DEBATE';
    if (m.includes('RELAY')) return '⚡ RELAY';
    if (m.includes('ROLEPLAY')) return '🤝 ROLEPLAY';
    if (m.includes('SOLO')) return '🎯 SOLO';
    return m;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* =====================================================================
          1. THANH ĐIỀU HƯỚNG HỆ SINH THÁI 6 PHÂN HỆ (ECOSYSTEM TOP NAVBAR)
         ===================================================================== */}
      <View style={styles.navbar}>
        <View style={styles.navInner}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>VS</Text>
            </View>
            <View>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandTitle}>VIPESPEAK ARENA</Text>
                <View style={styles.pillTag}>
                  <Text style={styles.pillTagText}>CEFR • IPA • VAR</Text>
                </View>
              </View>
              <Text style={styles.brandSub}>
                {isVi
                  ? 'Hệ Sinh Thái Khảo Thí & Đấu Trường Tiếng Anh AI'
                  : 'AI-Verified English Speaking & CEFR Arena'}
              </Text>
            </View>
          </View>

          <View style={styles.navLinksRow}>
            <TouchableOpacity style={[styles.navBtn, styles.navBtnActive]} onPress={onNavigateHub}>
              <Text style={styles.navBtnActiveText}>
                ⚔️ {isVi ? 'Sảnh Đấu Trường' : 'Arena Hub'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={onNavigateCefrTest}>
              <Text style={styles.navBtnText}>
                🎙️ {isVi ? 'AI Kiểm Định CEFR' : 'AI CEFR Lab'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={() => onSelectBattleMode('ROLEPLAY')}>
              <Text style={styles.navBtnText}>
                🤝 {isVi ? 'Ghép Cặp Roleplay' : 'Pair Roleplay'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => onNavigateProfile(primaryStudent?.student_code || '')}
            >
              <Text style={styles.navBtnText}>
                🪪 {isVi ? 'Hộ Chiếu SPEAK-ID' : 'SPEAK-ID'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navBtn, styles.navBtnVar]} onPress={onNavigateHub}>
              <Text style={styles.navBtnVarText}>
                🛡️ {isVi ? 'Cổng Giảng Viên & VAR' : 'Teacher VAR'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => setLang(isVi ? 'EN' : 'VI')}
            >
              <Text style={styles.langBtnText}>🌐 {lang}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* =====================================================================
          2. HERO BANNER CHUẨN KHẢO THÍ GIÁO DỤC
         ===================================================================== */}
      <View style={styles.heroSection}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>
            🔬 GEMINI IPA PHONETICS  •  📈 F0 INTONATION  •  🛡️ ANTI-PARROTING GUARD
          </Text>
        </View>

        <Text style={styles.heroTitle}>
          {isVi
            ? 'ĐẤU TRƯỜNG NÓI TIẾNG ANH CEFR\nSOLO • RELAY • ROLEPLAY • DEBATE'
            : 'VERIFIED CEFR SPEAKING ARENA\nSOLO • RELAY • ROLEPLAY • DEBATE'}
        </Text>

        <Text style={styles.heroSubtitle}>
          {isVi
            ? 'Hệ sinh thái luyện tập và thi đấu nói tiếng Anh toàn diện: tích hợp AI kiểm định âm vị IPA chuẩn Cambridge, bộ lọc chống đọc lặp đề bài cùng Phòng Thẩm Định Audio VAR lưu vết trên Hộ chiếu số SPEAK-ID.'
            : 'Complete English speaking competition and assessment ecosystem with Cambridge IPA phonetic audit, anti-parroting protection, and Teacher Audio VAR synced to SPEAK-ID.'}
        </Text>

        <View style={styles.heroCtaRow}>
          <TouchableOpacity style={styles.primaryCta} onPress={onNavigateCefrTest}>
            <Text style={styles.primaryCtaText}>
              🎙️ {isVi ? 'BẮT ĐẦU KIỂM ĐỊNH NÓI AI NGAY' : 'START AI SPEAKING CHECK'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryCta} onPress={onNavigateHub}>
            <Text style={styles.secondaryCtaText}>
              🏟️ {isVi ? 'VÀO SẢNH GIẢI ĐẤU & PHÒNG THI LỚP' : 'ENTER TOURNAMENT & CLASS HUB'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =====================================================================
          3. KHU VỰC 4 THỂ THỨC THI ĐẤU CỐT LÕI (SOLO • RELAY • ROLEPLAY • DEBATE)
         ===================================================================== */}
      <View style={styles.sectionWrapper}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>
            ⚔️ {isVi ? 'CHỌN THỂ THỨC THI ĐẤU & LUYỆN TẬP' : 'SELECT COMPETITION & PRACTICE FORMAT'}
          </Text>
          <Text style={styles.sectionTitle}>
            {isVi ? '4 Đấu Trường Kỹ Năng Nói Chuẩn CEFR' : '4 CEFR Speaking Arena Formats'}
          </Text>
          <Text style={styles.sectionDesc}>
            {isVi
              ? 'Bấm trực tiếp vào một trong 4 thể thức bên dưới để bước vào sân khấu thi đấu ngay lập tức'
              : 'Select any of the 4 competition formats below to enter the stage immediately'}
          </Text>
        </View>

        <View style={styles.grid4}>
          {battleModes.map((item) => (
            <View
              key={item.mode}
              style={[styles.modeCard, { borderColor: `${item.borderColor}55` }]}
            >
              <View>
                <View style={styles.modeCardTop}>
                  <Text style={styles.modeIcon}>{item.icon}</Text>
                  <View style={styles.modeBadge}>
                    <Text style={styles.modeBadgeText}>{item.badge}</Text>
                  </View>
                </View>

                <Text style={styles.modeTitle}>{isVi ? item.titleVi : item.titleEn}</Text>
                <Text style={styles.modeDesc}>{isVi ? item.descVi : item.descEn}</Text>

                <View style={styles.modeAuditBox}>
                  <Text style={styles.modeAuditText}>
                    {isVi ? item.auditVi : item.auditEn}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modeBtn, { backgroundColor: item.accentColor }]}
                onPress={() => onSelectBattleMode(item.mode)}
              >
                <Text style={styles.modeBtnText}>
                  {isVi ? `VÀO ĐẤU TRƯỜNG ${item.mode} ➔` : `ENTER ${item.mode} ARENA ➔`}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* =====================================================================
          4. KHUNG TRA CỨU HỘ CHIẾU NĂNG LỰC SPEAK-ID (SUPABASE LIVE SYNC)
         ===================================================================== */}
      <View style={styles.sectionWrapper}>
        <View style={styles.passportContainer}>
          <View style={styles.passportHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionEyebrow, { color: '#38BDF8' }]}>
                🪪 {isVi ? 'HỒ SƠ NĂNG LỰC SỐ HÓA • SUPABASE LIVE SYNC' : 'DIGITAL SPEAKING PASSPORT • SUPABASE LIVE'}
              </Text>
              <Text style={styles.passportTitle}>
                {isVi
                  ? 'Tra Cứu Hộ Chiếu SPEAK-ID, Điểm CEFR & Bản Thu Âm'
                  : 'Lookup SPEAK-ID Passport, CEFR Score & Audio Replay'}
              </Text>
            </View>

            <TouchableOpacity style={styles.demoBtn} onPress={handleResetDemo}>
              <Text style={styles.demoBtnText}>
                👁️ {isVi ? 'Xem Thẻ Mẫu Minh Họa' : 'Load Sample Passport'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Thanh tìm kiếm MSSV / Họ tên */}
          <View style={styles.searchBarRow}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                isVi
                  ? 'Nhập Mã số sinh viên (VD: 2685014) hoặc Họ tên sinh viên...'
                  : 'Enter Student ID (e.g., 2685014) or Full Name...'
              }
              placeholderTextColor="#64748B"
              onSubmitEditing={handleLookup}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={handleLookup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#020617" size="small" />
              ) : (
                <Text style={styles.searchBtnText}>
                  🔍 {isVi ? 'TRA CỨU NGAY' : 'SEARCH PASSPORT'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {/* Thẻ Hộ chiếu SPEAK-ID & 4 Chỉ số */}
          {primaryStudent && (
            <View style={{ marginTop: 20 }}>
              <View style={styles.idCardGrid}>
                <View style={styles.idIdentityBox}>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>
                      ✅ VERIFIED {isDemo ? '(DEMO)' : ''}
                    </Text>
                  </View>
                  <Text style={styles.speakIdText}>{speakIdCode}</Text>
                  <Text style={styles.studentNameText}>{primaryStudent.student_name}</Text>
                  <Text style={styles.cefrTargetText}>
                    {isVi ? 'Cấp độ CEFR:' : 'Target CEFR:'}{' '}
                    <Text style={{ color: '#38BDF8', fontWeight: '800' }}>
                      {primaryStudent.cefr_level || 'B1'}
                    </Text>
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>
                    {isVi ? 'ĐIỂM LƯỢT GẦN NHẤT' : 'LATEST SCORE'}
                  </Text>
                  <Text style={[styles.metricValue, { color: '#10B981' }]}>
                    {latestScore} / 100
                  </Text>
                  <Text style={styles.metricSub}>
                    {typeof primaryStudent.manual_score === 'number'
                      ? isVi
                        ? '🛡️ Giảng viên đã thẩm định'
                        : '🛡️ Teacher VAR Verified'
                      : isVi
                      ? '🤖 AI & IPA Chấm tự động'
                      : '🤖 AI & IPA Graded'}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>
                    {isVi ? 'ĐỈNH NĂNG LỰC (PEAK)' : 'PEAK CEFR SCORE'}
                  </Text>
                  <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
                    {peakScore} / 100
                  </Text>
                  <Text style={styles.metricSub}>
                    {isVi ? `Trung bình tích lũy: ${avgScore}đ` : `Cumulative Avg: ${avgScore} pts`}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>
                    {isVi ? 'LỊCH SỬ GHI ÂM' : 'RECORDED SESSIONS'}
                  </Text>
                  <Text style={styles.metricValue}>
                    {records.length} {isVi ? 'Bài' : 'Sessions'}
                  </Text>
                  <Text style={[styles.metricSub, { color: '#34D399' }]}>
                    {isVi ? 'Lưu vết âm thanh & IPA' : 'Audio & IPA Logged'}
                  </Text>
                </View>
              </View>

              {/* Danh sách lịch sử bài nói */}
              <Text style={styles.historyHeading}>
                🎬 {isVi ? 'LỊCH SỬ THI ĐẤU & AUDIO REPLAY' : 'COMPETITION HISTORY & AUDIO REPLAY'}
              </Text>

              <View style={styles.historyList}>
                {records.map((rec) => {
                  const finalScore = typeof rec.manual_score === 'number' ? rec.manual_score : rec.score;
                  const scoreColor =
                    finalScore >= 80 ? '#10B981' : finalScore >= 65 ? '#38BDF8' : '#F59E0B';
                  return (
                    <View key={rec.id} style={styles.historyRow}>
                      <View style={styles.historyLeft}>
                        <View style={styles.historyMetaRow}>
                          <Text style={styles.historyModeBadge}>{formatModeLabel(rec.mode)}</Text>
                          <Text style={styles.historyDate}>
                            {new Date(rec.created_at).toLocaleDateString('vi-VN')} • {rec.cefr_level}
                          </Text>
                          <View style={[styles.scorePill, { borderColor: `${scoreColor}66` }]}>
                            <Text style={[styles.scorePillText, { color: scoreColor }]}>
                              {finalScore}đ
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.historyTranscript} numberOfLines={2}>
                          "{rec.transcript}"
                        </Text>
                        <Text style={styles.historyFeedback} numberOfLines={2}>
                          {rec.feedback}
                        </Text>
                      </View>

                      <View style={styles.historyRight}>
                        {rec.audio_url ? (
                          Platform.OS === 'web' && playingAudioUrl === rec.audio_url ? (
                            // @ts-ignore - thẻ audio chuẩn trên React Native Web
                            <audio src={rec.audio_url} controls autoPlay style={{ height: 32, width: 170 }} />
                          ) : (
                            <TouchableOpacity
                              style={styles.playAudioBtn}
                              onPress={() => setPlayingAudioUrl(rec.audio_url || null)}
                            >
                              <Text style={styles.playAudioBtnText}>
                                🎧 {isVi ? 'Nghe lại' : 'Play'}
                              </Text>
                            </TouchableOpacity>
                          )
                        ) : (
                          <Text style={styles.noAudioText}>
                            {isVi ? 'Không có audio' : 'No audio'}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* =====================================================================
          5. 4 LỚP CÔNG NGHỆ KHẢO THÍ ĐỘC QUYỀN
         ===================================================================== */}
      <View style={styles.pillarsSection}>
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>
            🛡️ {isVi ? '4 LỚP CÔNG NGHỆ KHẢO THÍ CỦA VIPESPEAK ARENA' : '4 CORE ASSESSMENT PILLARS'}
          </Text>
          <Text style={[styles.sectionDesc, { textAlign: 'center', marginBottom: 24 }]}>
            {isVi
              ? 'Khắc phục triệt để chấm điểm cảm tính, đọc lặp đề bài và gian lận kịch bản trong thi nói tiếng Anh'
              : 'Eliminating subjective grading, prompt parroting, and script-reading in speaking exams'}
          </Text>

          <View style={styles.grid4}>
            <View style={styles.pillarCard}>
              <Text style={styles.pillarIcon}>🔬</Text>
              <Text style={styles.pillarTitle}>
                {isVi ? '1. Kiểm Định Âm Vị IPA' : '1. IPA Phoneme Audit'}
              </Text>
              <Text style={styles.pillarDesc}>
                {isVi
                  ? 'Gemini Audio nghe trực tiếp sóng âm để bắt lỗi nuốt âm cuối (-ed, -s), nhầm nguyên âm ngắn/dài và sai trọng âm từ theo chuẩn Cambridge.'
                  : 'Gemini Multimodal Audio inspects waveforms for dropped final consonants, vowel length, and word stress.'}
              </Text>
            </View>

            <View style={styles.pillarCard}>
              <Text style={styles.pillarIcon}>🛡️</Text>
              <Text style={styles.pillarTitle}>
                {isVi ? '2. Chống Lặp Đề & Đọc Kịch Bản' : '2. Anti-Parroting Guard'}
              </Text>
              <Text style={styles.pillarDesc}>
                {isVi
                  ? 'Tự động loại trừ phần đọc lặp lại câu hỏi đề bài (Net Original Words) và đo biến thiên cao độ F0 để phát hiện thí sinh đọc văn bản có sẵn.'
                  : 'Strips repeated prompt questions to measure net original speech and tracks F0 pitch variance to detect script reading.'}
              </Text>
            </View>

            <View style={styles.pillarCard}>
              <Text style={styles.pillarIcon}>🎧</Text>
              <Text style={styles.pillarTitle}>
                {isVi ? '3. Phòng Audio VAR Giảng Viên' : '3. Teacher Audio VAR'}
              </Text>
              <Text style={styles.pillarDesc}>
                {isVi
                  ? 'Giảng viên nghe lại bản ghi âm gốc, xem từng từ AI tô đỏ và bấm chốt điểm thẩm định đồng bộ tức thì lên Hộ chiếu SPEAK-ID.'
                  : 'Instructors replay original recordings, inspect highlighted errors, and lock verified scores onto student passports.'}
              </Text>
            </View>

            <View style={styles.pillarCard}>
              <Text style={styles.pillarIcon}>⚔️</Text>
              <Text style={styles.pillarTitle}>
                {isVi ? '4. Đấu Trường 4 Thể Thức' : '4. 4-Mode Live Arena'}
              </Text>
              <Text style={styles.pillarDesc}>
                {isVi
                  ? 'Hỗ trợ đầy đủ SOLO, RELAY, ROLEPLAY và DEBATE cho từng lớp học, lưu lịch sử phát lại và xếp hạng năng lực minh bạch.'
                  : 'Supports SOLO, RELAY, ROLEPLAY, and DEBATE for classroom competitions with full replay logs and rankings.'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  contentContainer: {
    paddingBottom: 60,
  },
  navbar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0B1120',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  navInner: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#020617',
    fontWeight: '900',
    fontSize: 16,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.4,
  },
  pillTag: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillTagText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '800',
  },
  brandSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  navLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  navBtnActive: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
  },
  navBtnActiveText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '800',
  },
  navBtnText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  navBtnVar: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
  },
  navBtnVarText: {
    color: '#7DD3FC',
    fontSize: 12,
    fontWeight: '700',
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  langBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  heroSection: {
    paddingVertical: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0F172A',
  },
  heroBadge: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.35)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 42,
    maxWidth: 900,
  },
  heroSubtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 740,
    marginTop: 14,
  },
  heroCtaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  primaryCta: {
    backgroundColor: '#10B981',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryCtaText: {
    color: '#020617',
    fontWeight: '900',
    fontSize: 13,
  },
  secondaryCta: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryCtaText: {
    color: '#BAE6FD',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionWrapper: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 36,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionEyebrow: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  sectionDesc: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  grid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  modeCard: {
    flexGrow: 1,
    flexBasis: 260,
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    justifyContent: 'space-between',
  },
  modeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeIcon: {
    fontSize: 28,
  },
  modeBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeBadgeText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
  },
  modeTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 14,
  },
  modeDesc: {
    color: '#CBD5E1',
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 8,
  },
  modeAuditBox: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
  },
  modeAuditText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnText: {
    color: '#020617',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  passportContainer: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 20,
  },
  passportHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 16,
  },
  passportTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  demoBtn: {
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  demoBtnText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  searchInput: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 13,
  },
  searchBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#020617',
    fontSize: 12,
    fontWeight: '900',
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: 10,
    padding: 12,
  },
  errorBoxText: {
    color: '#FDE68A',
    fontSize: 12,
  },
  idCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 14,
    padding: 16,
  },
  idIdentityBox: {
    flexGrow: 1,
    flexBasis: 220,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '800',
  },
  speakIdText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  studentNameText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cefrTargetText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  metricBox: {
    flexGrow: 1,
    flexBasis: 180,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  metricSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  historyHeading: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  historyList: {
    gap: 10,
  },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
  },
  historyLeft: {
    flex: 1,
    minWidth: 240,
  },
  historyMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  historyModeBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  historyDate: {
    color: '#94A3B8',
    fontSize: 11,
  },
  scorePill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  historyTranscript: {
    color: '#E2E8F0',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },
  historyFeedback: {
    color: '#6EE7B7',
    fontSize: 11,
    marginTop: 4,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  playAudioBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  playAudioBtnText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '800',
  },
  noAudioText: {
    color: '#64748B',
    fontSize: 11,
  },
  pillarsSection: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0F172A',
    paddingBottom: 24,
  },
  pillarCard: {
    flexGrow: 1,
    flexBasis: 250,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 18,
  },
  pillarIcon: {
    fontSize: 24,
  },
  pillarTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  pillarDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});