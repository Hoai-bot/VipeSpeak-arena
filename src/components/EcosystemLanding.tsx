// src/components/EcosystemLanding.tsx
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
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
  onNavigateModule: (moduleKey: 'ai-passport' | 'live-hub' | 'pair-arena' | 'passport' | 'events' | 'teacher-hub') => void;
}

const DEMO_STUDENT_RECORDS: SubmissionRecord[] = [
  {
    id: 'demo-1',
    student_name: 'NGUYỄN MINH KHANG',
    student_code: '2685014',
    mode: 'STATION_2_ROLEPLAY',
    cefr_level: 'B1',
    score: 88,
    manual_score: 90,
    transcript: 'What did you use to do when you were younger? I used to play badminton every afternoon, but now I go jogging in the park.',
    feedback: '[Phát âm: 91 | Ngữ điệu: 84 | Ngữ pháp: 95 | Nội dung: 94] 🌟 Xuất sắc! Diễn đạt tự nhiên, phân biệt tốt "used to" và hiện tại đơn.',
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
    transcript: 'However, I strongly believe that online learning provides greater flexibility for university students, whereas traditional classrooms require fixed commuting hours.',
    feedback: '[Phát âm: 88 | Ngữ điệu: 84 | Ngữ pháp: 87 | Nội dung: 90] 🚀 Tranh biện sắc bén, sử dụng từ nối tương phản học thuật chuẩn xác.',
    audio_url: null,
    class_name: '[CDTAK4] Trạm 2: DEBATE (B2)',
    created_at: '2026-11-22T14:15:10.000Z',
  },
];

export const EcosystemLanding: React.FC<EcosystemLandingProps> = ({
  onSelectBattleMode,
  onNavigateModule,
}) => {
  const [lang, setLang] = useState<'VI' | 'EN'>('VI');
  const [searchCode, setSearchCode] = useState('');
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [records, setRecords] = useState<SubmissionRecord[]>(DEMO_STUDENT_RECORDS);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const isVi = lang === 'VI';

  const battleModes: Array<{
    key: ArenaBattleMode;
    badge: string;
    icon: string;
    titleVi: string;
    titleEn: string;
    descVi: string;
    descEn: string;
    metricsVi: string;
    metricsEn: string;
    accentClass: string;
    btnClass: string;
  }> = [
    {
      key: 'SOLO',
      badge: '1 VS AI • CEFR',
      icon: '🎯',
      titleVi: 'ĐẤU TRƯỜNG SOLO',
      titleEn: 'SOLO ARENA',
      descVi: 'Độc thoại phản xạ cá nhân theo tình huống ngẫu nhiên A1–C2. Chấm điểm âm vị IPA, tốc độ WPM và loại trừ lặp đề.',
      descEn: 'Individual reflex monologue across CEFR A1–C2 prompts with IPA phoneme audit and net word count.',
      metricsVi: 'Kiểm định: IPA • Net Words • WPM',
      metricsEn: 'Audit: IPA • Net Words • WPM',
      accentClass: 'border-emerald-500/30 hover:border-emerald-400/70 bg-gradient-to-b from-emerald-950/30 to-[#111827]',
      btnClass: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
    },
    {
      key: 'RELAY',
      badge: 'TEAM • RELAY',
      icon: '⚡',
      titleVi: 'TIẾP SỨC RELAY',
      titleEn: 'RELAY ARENA',
      descVi: 'Thi đấu tiếp sức đồng đội: mỗi thành viên nối tiếp luận điểm mới trên cùng chủ đề mà không trùng lặp ý trước.',
      descEn: 'Team relay challenge where each speaker builds new supporting ideas sequentially without repetition.',
      metricsVi: 'Kiểm định: Mạch liên kết • Đa dạng từ vựng',
      metricsEn: 'Audit: Idea Continuity • Lexical TTR',
      accentClass: 'border-sky-500/30 hover:border-sky-400/70 bg-gradient-to-b from-sky-950/30 to-[#111827]',
      btnClass: 'bg-sky-500 text-slate-950 hover:bg-sky-400',
    },
    {
      key: 'ROLEPLAY',
      badge: 'PAIR • DIALOGUE',
      icon: '🤝',
      titleVi: 'NHẬP VAI ROLEPLAY',
      titleEn: 'ROLEPLAY ARENA',
      descVi: 'Đối thoại cặp đôi hỏi – đáp tự nhiên theo kịch bản giao tiếp thực tế (quá khứ, nghề nghiệp, dịch vụ, công sở).',
      descEn: 'Interactive pair dialogue in real-world scenarios (past habits, career, customer service, workplace).',
      metricsVi: 'Kiểm định: Phản xạ hỏi–đáp • Ngữ pháp hội thoại',
      metricsEn: 'Audit: Turn-Taking • Conversational Grammar',
      accentClass: 'border-violet-500/30 hover:border-violet-400/70 bg-gradient-to-b from-violet-950/30 to-[#111827]',
      btnClass: 'bg-violet-500 text-white hover:bg-violet-400',
    },
    {
      key: 'DEBATE',
      badge: 'PRO VS CON • B2-C2',
      icon: '⚖️',
      titleVi: 'TRANH BIỆN DEBATE',
      titleEn: 'DEBATE ARENA',
      descVi: 'Đấu trí phản biện 2 phe Ủng hộ (PRO) & Phản đối (CON). AI chấm điểm từ nối học thuật và cấu trúc câu phức.',
      descEn: 'Competitive PRO vs. CON argumentation rewarding academic connectors and complex syntactic structures.',
      metricsVi: 'Kiểm định: Lập luận • Cấu trúc nâng cao',
      metricsEn: 'Audit: Argumentation • Advanced Clauses',
      accentClass: 'border-amber-500/30 hover:border-amber-400/70 bg-gradient-to-b from-amber-950/30 to-[#111827]',
      btnClass: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    },
  ];

  const handleLookupSpeakId = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchCode.trim();
    if (!query) {
      setLookupError(isVi ? 'Vui lòng nhập MSSV hoặc Họ tên sinh viên để tra cứu.' : 'Please enter Student ID or Name to search.');
      return;
    }

    setLookupError('');
    setLoadingLookup(true);

    try {
      if (!supabase) {
        throw new Error(isVi ? 'Chưa cấu hình VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.' : 'Supabase credentials missing.');
      }

      const { data, error } = await supabase
        .from('submissions')
        .select('id, student_name, student_code, mode, cefr_level, score, manual_score, transcript, feedback, audio_url, class_name, created_at')
        .or(`student_code.ilike.%${query}%,student_name.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      if (!data || data.length === 0) {
        setLookupError(
          isVi
            ? `Không tìm thấy hồ sơ bài nói nào khớp với "${query}". Hãy thử lại bằng MSSV chính xác.`
            : `No speaking records found matching "${query}".`
        );
        setRecords([]);
        setIsDemoMode(false);
      } else {
        setRecords(data as SubmissionRecord[]);
        setIsDemoMode(false);
      }
    } catch (err: any) {
      setLookupError(err?.message || (isVi ? 'Lỗi kết nối máy chủ Supabase.' : 'Supabase connection error.'));
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleLoadDemo = () => {
    setSearchCode('2685014');
    setLookupError('');
    setRecords(DEMO_STUDENT_RECORDS);
    setIsDemoMode(true);
  };

  const effectiveScores = records.map((r) => (typeof r.manual_score === 'number' ? r.manual_score : r.score));
  const latestScore = effectiveScores.length > 0 ? effectiveScores[0] : 0;
  const peakScore = effectiveScores.length > 0 ? Math.max(...effectiveScores) : 0;
  const avgScore = effectiveScores.length > 0
    ? Math.round(effectiveScores.reduce((sum, s) => sum + s, 0) / effectiveScores.length)
    : 0;
  const primaryStudent = records[0];
  const speakIdBadge = primaryStudent?.student_code && primaryStudent.student_code !== 'GUEST'
    ? `SPEAK-${primaryStudent.student_code.toUpperCase()}`
    : 'SPEAK-GUEST-2026';

  const formatStationName = (mode: string) => {
    if (mode.includes('DEBATE')) return isVi ? 'Đấu Trường • DEBATE' : 'Arena • DEBATE';
    if (mode.includes('RELAY')) return isVi ? 'Đấu Trường • RELAY' : 'Arena • RELAY';
    if (mode.includes('ROLEPLAY')) return isVi ? 'Đấu Trường • ROLEPLAY' : 'Arena • ROLEPLAY';
    if (mode.includes('SOLO')) return isVi ? 'Đấu Trường • SOLO' : 'Arena • SOLO';
    if (mode.includes('STATION_1')) return isVi ? 'Trạm 1 • Phát âm IPA' : 'Station 1 • IPA Lab';
    if (mode.includes('STATION_3')) return isVi ? 'Trạm 3 • Shadowing' : 'Station 3 • Ghost Echo';
    if (mode.includes('STATION_4')) return isVi ? 'Trạm 4 • Phản xạ nhanh' : 'Station 4 • Express';
    return mode;
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* =====================================================================
          1. THANH ĐIỀU HƯỚNG HỆ SINH THÁI 6 PHÂN HỆ
         ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1120]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 font-black text-slate-950 shadow-lg shadow-emerald-500/20">
              VS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">VIPESPEAK ARENA</span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  SOLO • RELAY • ROLEPLAY • DEBATE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isVi ? 'Hệ Sinh Thái Khảo Thí & Đấu Trường Tiếng Anh AI' : 'AI-Verified English Speaking & CEFR Arena'}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <a
              href="#arena-modes"
              className="rounded-lg bg-emerald-500/15 px-3 py-2 text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25"
            >
              ⚔️ {isVi ? '4 Thể Thức Đấu Trường' : '4 Arena Modes'}
            </a>
            <button
              onClick={() => onNavigateModule('ai-passport')}
              className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              🎙️ {isVi ? 'AI Kiểm Định CEFR' : 'AI CEFR Lab'}
            </button>
            <button
              onClick={() => onNavigateModule('live-hub')}
              className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              🏟️ {isVi ? 'Phòng Thi Mã Lớp' : 'Class Live Hub'}
            </button>
            <a
              href="#speak-id-lookup"
              className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              🪪 {isVi ? 'Hộ Chiếu SPEAK-ID' : 'SPEAK-ID'}
            </a>
            <button
              onClick={() => onNavigateModule('events')}
              className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              🏆 {isVi ? 'Bảng Vàng' : 'Leaderboard'}
            </button>
            <button
              onClick={() => onNavigateModule('teacher-hub')}
              className="rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-sky-300 transition hover:bg-sky-500/20"
            >
              🛡️ {isVi ? 'Cổng Giảng Viên & VAR' : 'Teacher VAR'}
            </button>
            <button
              onClick={() => setLang(isVi ? 'EN' : 'VI')}
              className="ml-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
            >
              🌐 {lang}
            </button>
          </nav>
        </div>
      </header>

      {/* =====================================================================
          2. HERO BANNER CHUẨN KHẢO THÍ GIÁO DỤC
         ===================================================================== */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#0F172A] to-[#0B1120] py-12 sm:py-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="mb-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-300">
            <span>🔬 GEMINI IPA PHONETICS</span>
            <span>•</span>
            <span>📈 F0 INTONATION CONTOUR</span>
            <span>•</span>
            <span>🛡️ ANTI-SCRIPT & PARROTING GUARD</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl sm:leading-tight">
            {isVi ? (
              <>
                ĐẤU TRƯỜNG NÓI TIẾNG ANH <span className="text-emerald-400">CEFR</span>
                <br />
                SOLO • RELAY • ROLEPLAY • DEBATE
              </>
            ) : (
              <>
                VERIFIED <span className="text-emerald-400">CEFR</span> SPEAKING ARENA
                <br />
                SOLO • RELAY • ROLEPLAY • DEBATE
              </>
            )}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {isVi
              ? 'Hệ sinh thái luyện tập và thi đấu nói tiếng Anh toàn diện: tích hợp AI kiểm định âm vị IPA chuẩn Cambridge, chống đọc lặp đề bài và Phòng Thẩm Định Audio VAR lưu vết trên Hộ chiếu SPEAK-ID.'
              : 'Complete English speaking competition and assessment ecosystem with Cambridge IPA phonetic audit, anti-parroting guard, and Teacher Audio VAR synced to SPEAK-ID.'}
          </p>
        </div>
      </section>

      {/* =====================================================================
          3. KHU VỰC 4 THỂ THỨC THI ĐẤU CỐT LÕI (SOLO • RELAY • ROLEPLAY • DEBATE)
         ===================================================================== */}
      <section id="arena-modes" className="mx-auto max-w-7xl px-4 pt-12 pb-6 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              ⚔️ {isVi ? 'CHỌN THỂ THỨC THI ĐẤU & LUYỆN TẬP' : 'SELECT COMPETITION & PRACTICE FORMAT'}
            </span>
            <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              {isVi ? '4 Đấu Trường Kỹ Năng Nói Chuẩn CEFR' : '4 CEFR Speaking Arena Formats'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {isVi ? 'Bấm trực tiếp vào thể thức để vào phòng thu âm ngay lập tức' : 'Click any format below to launch the recording arena immediately'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {battleModes.map((item) => (
            <div
              key={item.key}
              className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xl transition duration-200 ${item.accentClass}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-slate-300">
                    {item.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-black tracking-tight text-white">
                  {isVi ? item.titleVi : item.titleEn}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {isVi ? item.descVi : item.descEn}
                </p>

                <div className="mt-4 rounded-lg border border-white/10 bg-[#0B1120]/80 px-3 py-2 text-[11px] font-medium text-slate-300">
                  {isVi ? item.metricsVi : item.metricsEn}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectBattleMode(item.key)}
                className={`mt-5 w-full rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider shadow-md transition ${item.btnClass}`}
              >
                {isVi ? `VÀO ĐẤU TRƯỜNG ${item.key} ➔` : `ENTER ${item.key} ARENA ➔`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          4. KHUNG TRA CỨU HỘ CHIẾU NĂNG LỰC SPEAK-ID (KẾT NỐI TRỰC TIẾP SUPABASE)
         ===================================================================== */}
      <section id="speak-id-lookup" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#111827]/90 p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                🪪 {isVi ? 'HỒ SƠ NĂNG LỰC SỐ HÓA • SUPABASE LIVE SYNC' : 'DIGITAL SPEAKING PASSPORT • SUPABASE LIVE'}
              </span>
              <h2 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">
                {isVi ? 'Tra Cứu Hộ Chiếu SPEAK-ID, Điểm CEFR & Bản Thu Âm' : 'Lookup SPEAK-ID Passport, CEFR Score & Audio Replay'}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleLoadDemo}
              className="self-start rounded-lg border border-amber-400/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 md:self-auto"
            >
              👁️ {isVi ? 'Xem Thẻ Mẫu Minh Họa' : 'Load Sample Passport'}
            </button>
          </div>

          <form onSubmit={handleLookupSpeakId} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder={
                isVi
                  ? 'Nhập Mã số sinh viên (VD: 2685014) hoặc Họ tên sinh viên...'
                  : 'Enter Student ID (e.g., 2685014) or Full Name...'
              }
              className="flex-1 rounded-xl border border-white/15 bg-[#0B1120] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loadingLookup}
              className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
            >
              {loadingLookup
                ? isVi
                  ? '⏳ Đang truy vấn...'
                  : '⏳ Searching...'
                : isVi
                ? '🔍 TRA CỨU NGAY'
                : '🔍 SEARCH PASSPORT'}
            </button>
          </form>

          {lookupError && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-200">
              ⚠️ {lookupError}
            </div>
          )}

          {primaryStudent && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 via-[#0B1120] to-sky-950/30 p-5 md:grid-cols-4">
                <div className="md:col-span-1">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                    <span>✅ VERIFIED</span>
                    {isDemoMode && <span className="text-[10px] text-amber-300">(DEMO)</span>}
                  </div>
                  <div className="mt-2 font-mono text-lg font-black tracking-wide text-white">{speakIdBadge}</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-300">{primaryStudent.student_name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {isVi ? 'Cấp độ mục tiêu:' : 'Target CEFR:'}{' '}
                    <span className="font-bold text-sky-300">{primaryStudent.cefr_level || 'B1'}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0B1120]/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">
                    {isVi ? 'Điểm Lượt Gần Nhất' : 'Latest Verified Score'}
                  </div>
                  <div className="mt-1 text-2xl font-black text-emerald-400">{latestScore} / 100</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {typeof primaryStudent.manual_score === 'number'
                      ? isVi
                        ? '🛡️ Giảng viên đã thẩm định'
                        : '🛡️ Teacher VAR Verified'
                      : isVi
                      ? '🤖 AI & IPA Chấm tự động'
                      : '🤖 AI & IPA Graded'}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0B1120]/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">
                    {isVi ? 'Đỉnh Năng Lực (Peak)' : 'Peak CEFR Score'}
                  </div>
                  <div className="mt-1 text-2xl font-black text-sky-400">{peakScore} / 100</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {isVi ? `Trung bình tích lũy: ${avgScore}đ` : `Cumulative Avg: ${avgScore} pts`}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#0B1120]/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase text-slate-400">
                    {isVi ? 'Lịch Sử Ghi Âm' : 'Recorded Sessions'}
                  </div>
                  <div className="mt-1 text-2xl font-black text-white">
                    {records.length} {isVi ? 'Bài' : 'Sessions'}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-300">
                    {isVi ? 'Lưu vết âm thanh & IPA' : 'Audio & IPA Logged'}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">
                  🎬 {isVi ? 'Lịch Sử Thi Đấu & Audio Replay' : 'Competition History & Audio Replay'}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/5 text-[11px] uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">{isVi ? 'Thể Thức / Trạm' : 'Arena Mode'}</th>
                        <th className="px-4 py-3">{isVi ? 'Bản gỡ băng & Nhận xét AI' : 'Transcript & AI Audit'}</th>
                        <th className="px-4 py-3 text-center">{isVi ? 'Điểm Chốt' : 'Score'}</th>
                        <th className="px-4 py-3 text-right">{isVi ? 'Audio Gốc' : 'Replay'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-[#0B1120]/60">
                      {records.map((item) => {
                        const finalScore = typeof item.manual_score === 'number' ? item.manual_score : item.score;
                        const isTeacherReviewed = typeof item.manual_score === 'number';
                        return (
                          <tr key={item.id} className="transition hover:bg-white/[0.03]">
                            <td className="whitespace-nowrap px-4 py-3.5 align-top">
                              <div className="font-bold text-slate-200">{formatStationName(item.mode)}</div>
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                {new Date(item.created_at).toLocaleDateString('vi-VN')} • {item.cefr_level}
                              </div>
                            </td>
                            <td className="max-w-md px-4 py-3.5 align-top">
                              <p className="line-clamp-2 italic text-slate-300">"{item.transcript}"</p>
                              <p className="mt-1 line-clamp-2 text-[11px] text-emerald-300/90">{item.feedback}</p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-center align-top">
                              <span
                                className={`inline-block rounded-lg px-2.5 py-1 text-xs font-black ${
                                  finalScore >= 80
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : finalScore >= 65
                                    ? 'bg-sky-500/20 text-sky-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {finalScore}đ
                              </span>
                              {isTeacherReviewed && (
                                <div className="mt-1 text-[10px] font-semibold text-sky-400">
                                  {isVi ? 'GV đã chốt' : 'VAR Verified'}
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right align-top">
                              {item.audio_url ? (
                                playingUrl === item.audio_url ? (
                                  <audio src={item.audio_url} controls autoPlay className="ml-auto h-8 w-44" />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setPlayingUrl(item.audio_url || null)}
                                    className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                                  >
                                    🎧 {isVi ? 'Nghe lại' : 'Play'}
                                  </button>
                                )
                              ) : (
                                <span className="text-[11px] text-slate-500">
                                  {isVi ? 'Không có audio' : 'No audio'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default EcosystemLanding;