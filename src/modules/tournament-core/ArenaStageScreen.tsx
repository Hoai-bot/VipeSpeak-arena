// E:\DuAnAI\VipeSpeak-arena\src\modules\tournament-core\ArenaStageScreen.tsx
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
import { TournamentItem } from './ArenaHubScreen';
import { useArenaAntiCheat } from '../anti-cheat/useArenaAntiCheat';
import { ARENA_TRANSLATIONS, AppLang, getBilingualText } from '../i18n/translations';

interface Props {
  tournament: TournamentItem;
  lang?: AppLang;
  onBack: () => void;
}

interface PhonemeAuditResult {
  phonemeAccuracyScore?: number;
  ipaHighlight?: string[];
  stressAndEndingNote?: string;
}

interface TurnEvaluationDetail {
  score: number;
  transcript: string;
  feedback: string;
  audioUrl?: string;
  phonemeAnalysis?: PhonemeAuditResult | null;
  rubrics?: {
    pronunciation?: number;
    intonation?: number;
    fluency?: number;
    vocabulary?: number;
    grammar?: number;
    content?: number;
  };
}

const SAMPLE_MOTIONS_BY_LEVEL: Record<string, { motion_en: string; context_vi: string; context_en: string }[]> = {
  A1: [
    {
      motion_en: 'Studying English online is better than studying in a traditional classroom.',
      context_vi: 'Trình bày quan điểm đơn giản về việc học tiếng Anh trực tuyến so với lớp học truyền thống.',
      context_en: 'Share simple reasons comparing online English learning with traditional classrooms.',
    },
  ],
  A2: [
    {
      motion_en: 'Public transport should be free for all university students.',
      context_vi: 'Thảo luận về việc miễn phí xe buýt/tàu điện cho sinh viên đại học.',
      context_en: 'Discuss whether public transport should be free for university students.',
    },
  ],
  B1: [
    {
      motion_en: 'Social media does more harm than good to teenagers.',
      context_vi: 'Tranh biện về tác động tiêu cực và tích cực của mạng xã hội đối với thanh thiếu niên.',
      context_en: 'Debate the positive and negative impacts of social media on teenagers.',
    },
  ],
  B2: [
    {
      motion_en: 'Artificial Intelligence will create more jobs than it replaces in the next decade.',
      context_vi: 'Phân tích tác động của trí tuệ nhân tạo tới thị trường việc làm trong 10 năm tới.',
      context_en: 'Analyze how AI will reshape job creation versus job displacement over the next decade.',
    },
  ],
  C1: [
    {
      motion_en: 'Tech corporations should be legally liable for algorithmic bias and misinformation.',
      context_vi: 'Tranh biện về trách nhiệm pháp lý của các tập đoàn công nghệ đối với thuật toán và tin giả.',
      context_en: 'Debate legal liability of tech giants regarding algorithmic bias and misinformation.',
    },
  ],
  C2: [
    {
      motion_en: 'Universal Basic Income is an ethical necessity in an automated post-scarcity economy.',
      context_vi: 'Lập luận chuyên sâu về thu nhập cơ bản phổ quát trong nền kinh tế tự động hóa.',
      context_en: 'Argue the ethical and economic viability of Universal Basic Income in an automated society.',
    },
  ],
};

const DEBATE_STEPS = [
  { key: 'R1_P1', label: 'Vòng 1 (Mở bài) • Phe Ủng Hộ (P1)', slot: 'P1' as const },
  { key: 'R1_P2', label: 'Vòng 1 (Mở bài) • Phe Phản Đối (P2)', slot: 'P2' as const },
  { key: 'R2_P2', label: 'Vòng 2 (Phản biện) • Phe Phản Đối (P2)', slot: 'P2' as const },
  { key: 'R2_P1', label: 'Vòng 2 (Phản biện) • Phe Ủng Hộ (P1)', slot: 'P1' as const },
  { key: 'R3_P1', label: 'Vòng 3 (Kết luận) • Phe Ủng Hộ (P1)', slot: 'P1' as const },
  { key: 'R3_P2', label: 'Vòng 3 (Kết luận) • Phe Phản Đối (P2)', slot: 'P2' as const },
];

export default function ArenaStageScreen({ tournament, lang = 'vi', onBack }: Props) {
  const t = ARENA_TRANSLATIONS[lang];
  const isVi = lang === 'vi';

  // Bước 1: Check-in thí sinh & tạo/vào phòng đấu
  const [studentName, setStudentName] = useState<string>('');
  const [studentCode, setStudentCode] = useState<string>('');
  const [selectedCefr, setSelectedCefr] = useState<string>(
    tournament.cefr_level && tournament.cefr_level !== 'OPEN' ? tournament.cefr_level : 'B1'
  );
  const [partnerName, setPartnerName] = useState<string>('');
  const [partnerCode, setPartnerCode] = useState<string>('');
  const [offlinePinInput, setOfflinePinInput] = useState<string>('');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [enableLivestream, setEnableLivestream] = useState<boolean>(true);
  const [youtubeLiveUrl, setYoutubeLiveUrl] = useState<string>('');

  const [matchRecord, setMatchRecord] = useState<any>(null);
  const [playerSlot, setPlayerSlot] = useState<'P1' | 'P2'>('P1');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Bước 2: Trạng thái thi đấu, Prep-time lock & Ghi âm
  const [phase, setPhase] = useState<'CHECKIN' | 'PREP_LOCKED' | 'RECORDING' | 'GRADING' | 'RESULT'>('CHECKIN');
  const [prepSecondsLeft, setPrepSecondsLeft] = useState<number>(15);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [debateStepIdx, setDebateStepIdx] = useState<number>(0);
  const [debateRoundsData, setDebateRoundsData] = useState<Record<string, any>>({});
  const [pairTurnSlot, setPairTurnSlot] = useState<'P1' | 'P2'>('P1');

  // Lưu chi tiết kết quả AI & Âm vị IPA của lượt vừa chấm
  const [latestEvalDetail, setLatestEvalDetail] = useState<TurnEvaluationDetail | null>(null);

  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Giám sát chống chuyển tab ngay khi đề bài mở khóa
  const { tabSwitchCount, isDisqualified } = useArenaAntiCheat({
    matchId: matchRecord?.id || null,
    playerSlot,
    isActive: phase === 'PREP_LOCKED' || phase === 'RECORDING',
    maxAllowedSwitches: 2,
    onViolationWarning: (count, dq) => {
      setStatusMsg(
        dq
          ? `⛔ BẠN ĐÃ BỊ TRUẤT QUYỀN THI ĐẤU DO RỜI MÀN HÌNH QUÁ ${count} LẦN!`
          : `${t.anti_cheat_tab_warn} (${count}/2)`
      );
    },
  });

  // Lắng nghe đồng bộ phòng đấu 2 thiết bị Online qua Supabase Realtime
  useEffect(() => {
    if (!supabase || !matchRecord?.id) return;

    const channel = supabase
      .channel(`arena-room-${matchRecord.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchRecord.id}` },
        (payload) => {
          if (payload.new) {
            setMatchRecord(payload.new);
            if (payload.new.debate_rounds) {
              setDebateRoundsData(payload.new.debate_rounds);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchRecord?.id]);

  // Đồng hồ đếm ngược 15 giây chuẩn bị
  useEffect(() => {
    if (phase !== 'PREP_LOCKED') return;
    if (prepSecondsLeft <= 0) {
      startTurnRecording();
      return;
    }
    const timer = setTimeout(() => setPrepSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, prepSecondsLeft]);

  // Đồng hồ đếm giây thu âm
  useEffect(() => {
    if (phase !== 'RECORDING') return;
    const timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const handleCheckInAndCreateMatch = async () => {
    if (!studentName.trim() || !studentCode.trim()) {
      setStatusMsg(
        isVi
          ? '⚠️ Vui lòng nhập đầy đủ Họ tên và Mã số sinh viên (MSSV)!'
          : '⚠️ Please enter your Full Name and Student ID!'
      );
      return;
    }
    if (!supabase) return;

    setIsJoining(true);
    setStatusMsg('');
    try {
      const cleanCode = studentCode.trim().toUpperCase();
      const cleanName = studentName.trim();

      // 1. Ghi sổ cái tournament_participants
      await supabase.from('tournament_participants').upsert(
        [
          {
            tournament_id: tournament.id,
            student_code: cleanCode,
            student_name: cleanName,
          },
        ],
        { onConflict: 'tournament_id,student_code', ignoreDuplicates: true }
      );

      // 2. Tham gia phòng có sẵn bằng Mã phòng 6 ký tự
      const joinCode = roomCodeInput.trim().toUpperCase();
      if (joinCode) {
        const { data: existingMatch, error: findErr } = await supabase
          .from('matches')
          .select('*')
          .eq('room_code', joinCode)
          .single();

        if (findErr || !existingMatch) {
          setStatusMsg('❌ Không tìm thấy phòng đấu với mã này. Hãy kiểm tra lại!');
          return;
        }

        const { data: updatedMatch } = await supabase
          .from('matches')
          .update({
            player2_code: cleanCode,
            player2_name: cleanName,
            live_status: 'PREP_TIME',
          })
          .eq('id', existingMatch.id)
          .select()
          .single();

        setPlayerSlot('P2');
        setMatchRecord(updatedMatch || existingMatch);
        setPrepSecondsLeft(15);
        setPhase('PREP_LOCKED');
        return;
      }

      // 3. Tạo trận đấu mới
      const levelPool = SAMPLE_MOTIONS_BY_LEVEL[selectedCefr] || SAMPLE_MOTIONS_BY_LEVEL.B1;
      const chosenPrompt = levelPool[Math.floor(Math.random() * levelPool.length)];
      const generatedRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const isSingleDevicePair =
        tournament.mode !== 'SOLO' && tournament.device_mode === 'SINGLE_DEVICE';

      const { data: createdMatch, error: createErr } = await supabase
        .from('matches')
        .insert([
          {
            tournament_id: tournament.id,
            round_name: 'Arena Official Match',
            room_code: generatedRoomCode,
            mode: tournament.mode,
            cefr_level: selectedCefr,
            player1_code: cleanCode,
            player1_name: cleanName,
            player2_code: isSingleDevicePair ? partnerCode.trim().toUpperCase() || 'PARTNER_B' : null,
            player2_name: isSingleDevicePair ? partnerName.trim() || 'Thí sinh B' : null,
            prompt_data: chosenPrompt,
            is_live: enableLivestream,
            live_stream_url: youtubeLiveUrl.trim() || null,
            live_status: 'PREP_TIME',
          },
        ])
        .select()
        .single();

      if (createErr || !createdMatch) {
        setStatusMsg(`❌ Không thể khởi tạo trận đấu: ${createErr?.message || 'Lỗi kết nối'}`);
        return;
      }

      setPlayerSlot('P1');
      setMatchRecord(createdMatch);
      setPrepSecondsLeft(15);
      setPhase('PREP_LOCKED');
    } finally {
      setIsJoining(false);
    }
  };

  const startTurnRecording = async () => {
    try {
      audioChunksRef.current = [];
      setRecordSeconds(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new (window as any).MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(150);
      setPhase('RECORDING');

      const activeSlot =
        tournament.mode === 'DEBATE'
          ? DEBATE_STEPS[debateStepIdx].slot
          : tournament.device_mode === 'SINGLE_DEVICE'
          ? pairTurnSlot
          : playerSlot;

      if (supabase && matchRecord?.id) {
        await supabase
          .from('matches')
          .update({ live_status: activeSlot === 'P1' ? 'P1_SPEAKING' : 'P2_SPEAKING' })
          .eq('id', matchRecord.id);
      }
    } catch {
      setStatusMsg('❌ Không thể truy cập Micro. Vui lòng cấp quyền trên trình duyệt!');
    }
  };

  const stopTurnAndSubmitToAI = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    mediaRecorderRef.current.onstop = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await gradeAndSyncTurn(audioBlob);
    };

    mediaRecorderRef.current.stop();
    setPhase('GRADING');
  };

  // Trích xuất 6 chỉ số Rubrics từ chuỗi feedback nếu backend trả kèm hoặc dùng fallback thông minh
  const parseRubricsFromEval = (evalJson: any, baseScore: number) => {
    if (evalJson?.rubrics) return evalJson.rubrics;
    const fb = String(evalJson?.feedback || '');
    const extract = (label: string) => {
      const m = fb.match(new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
      return m ? Math.round(Number(m[1])) : undefined;
    };
    const pron = evalJson?.phonemeAnalysis?.phonemeAccuracyScore
      ? Math.round(Number(evalJson.phonemeAnalysis.phonemeAccuracyScore))
      : extract('Phát âm') ?? baseScore;
    return {
      pronunciation: pron,
      intonation: extract('Ngữ điệu') ?? Math.max(50, Math.min(100, baseScore - 2)),
      fluency: extract('Độ trôi chảy') ?? Math.max(50, Math.min(100, baseScore - 3)),
      vocabulary: extract('Từ vựng') ?? baseScore,
      grammar: extract('Ngữ pháp') ?? Math.max(50, Math.min(100, baseScore + 1)),
      content: extract('Nội dung') ?? baseScore,
    };
  };

  const gradeAndSyncTurn = async (audioBlob: Blob) => {
    if (!supabase || !matchRecord) return;

    try {
      const currentSlot =
        tournament.mode === 'DEBATE'
          ? DEBATE_STEPS[debateStepIdx].slot
          : tournament.device_mode === 'SINGLE_DEVICE'
          ? pairTurnSlot
          : playerSlot;

      // 1. Tải file âm thanh lên Supabase Storage
      const fileName = `arena_${matchRecord.id}_${currentSlot}_${Date.now()}.webm`;
      let publicAudioUrl = '';
      const { data: upData } = await supabase.storage.from('submissions').upload(fileName, audioBlob, {
        contentType: 'audio/webm',
      });
      if (upData) {
        const { data: urlObj } = supabase.storage.from('submissions').getPublicUrl(fileName);
        publicAudioUrl = urlObj?.publicUrl || '';
      }

      // 2. Gửi sang lõi AI chấm điểm (/api/grade-audio)
      const promptText = matchRecord.prompt_data?.motion_en || 'English speaking tournament prompt';
      const fd = new FormData();
      fd.append('audio', audioBlob, 'arena_turn.webm');
      fd.append('prompt', `Mode: FREE_SPEECH | Tournament: ${tournament.mode} | Topic: ${promptText}`);
      fd.append('stationType', 'STATION_2');
      fd.append('level', matchRecord.cefr_level || 'B1');

      const aiRes = await fetch('/api/grade-audio', { method: 'POST', body: fd });
      const evalJson = await aiRes.json();
      const turnScore = Math.round(Number(evalJson?.score || 0));
      const turnTranscript = evalJson?.transcript || '';
      const turnFeedback = evalJson?.feedback || '';
      const phonemeAnalysis: PhonemeAuditResult | null = evalJson?.phonemeAnalysis || null;

      setLatestEvalDetail({
        score: turnScore,
        transcript: turnTranscript,
        feedback: turnFeedback,
        audioUrl: publicAudioUrl,
        phonemeAnalysis,
        rubrics: parseRubricsFromEval(evalJson, turnScore),
      });

      // 3. Xử lý riêng cho thể thức DEBATE 3 vòng (6 lượt)
      if (tournament.mode === 'DEBATE') {
        const stepKey = DEBATE_STEPS[debateStepIdx].key;
        const updatedRounds = {
          ...debateRoundsData,
          [stepKey]: {
            slot: currentSlot,
            score: turnScore,
            transcript: turnTranscript,
            audio_url: publicAudioUrl,
            feedback: turnFeedback,
            phonemeAnalysis,
          },
        };
        setDebateRoundsData(updatedRounds);

        if (debateStepIdx < DEBATE_STEPS.length - 1) {
          const nextIdx = debateStepIdx + 1;
          setDebateStepIdx(nextIdx);
          await supabase
            .from('matches')
            .update({
              debate_rounds: updatedRounds,
              ...(currentSlot === 'P1' ? { player1_audio_url: publicAudioUrl } : { player2_audio_url: publicAudioUrl }),
              live_status: 'PREP_TIME',
            })
            .eq('id', matchRecord.id);

          setPrepSecondsLeft(10);
          setPhase('PREP_LOCKED');
          return;
        }

        const p1Scores = ['R1_P1', 'R2_P1', 'R3_P1'].map((k) => Number(updatedRounds[k]?.score || 0));
        const p2Scores = ['R1_P2', 'R2_P2', 'R3_P2'].map((k) => Number(updatedRounds[k]?.score || 0));
        const avgP1 = Math.round(p1Scores.reduce((a, b) => a + b, 0) / 3);
        const avgP2 = Math.round(p2Scores.reduce((a, b) => a + b, 0) / 3);
        const winner = avgP1 >= avgP2 ? matchRecord.player1_code : matchRecord.player2_code;

        const { data: finalMatch } = await supabase
          .from('matches')
          .update({
            debate_rounds: updatedRounds,
            player1_score: avgP1,
            player2_score: avgP2,
            rebuttal_score_p1: updatedRounds.R2_P1?.score || 0,
            rebuttal_score_p2: updatedRounds.R2_P2?.score || 0,
            final_score: Math.max(avgP1, avgP2),
            winner_code: winner,
            ai_feedback: { vi: turnFeedback, en: turnFeedback },
            live_status: 'FINISHED',
          })
          .eq('id', matchRecord.id)
          .select()
          .single();

        if (finalMatch) setMatchRecord(finalMatch);
        setPhase('RESULT');
        return;
      }

      // 4. Xử lý cho SOLO, RELAY & ROLEPLAY
      const isPairMode = tournament.mode === 'RELAY' || tournament.mode === 'ROLEPLAY';
      if (isPairMode && tournament.device_mode === 'SINGLE_DEVICE' && pairTurnSlot === 'P1') {
        const { data: midMatch } = await supabase
          .from('matches')
          .update({
            player1_score: turnScore,
            player1_audio_url: publicAudioUrl,
            live_status: 'PREP_TIME',
          })
          .eq('id', matchRecord.id)
          .select()
          .single();

        if (midMatch) setMatchRecord(midMatch);
        setPairTurnSlot('P2');
        setPrepSecondsLeft(10);
        setPhase('PREP_LOCKED');
        return;
      }

      const p1Final = currentSlot === 'P1' ? turnScore : Number(matchRecord.player1_score || turnScore);
      const p2Final = currentSlot === 'P2' ? turnScore : Number(matchRecord.player2_score || 0);
      const teamBonus = isPairMode ? 5 : 0;
      const overallFinal = isPairMode
        ? Math.min(100, Math.round((p1Final + p2Final) / 2 + teamBonus))
        : p1Final;

      const { data: doneMatch } = await supabase
        .from('matches')
        .update({
          ...(currentSlot === 'P1'
            ? { player1_score: turnScore, player1_audio_url: publicAudioUrl }
            : { player2_score: turnScore, player2_audio_url: publicAudioUrl }),
          team_bonus_score: teamBonus,
          final_score: overallFinal,
          winner_code: matchRecord.player1_code,
          ai_feedback: { vi: turnFeedback, en: turnFeedback },
          live_status: 'FINISHED',
        })
        .eq('id', matchRecord.id)
        .select()
        .single();

      if (doneMatch) setMatchRecord(doneMatch);
      setPhase('RESULT');
    } catch (err: any) {
      setStatusMsg(`❌ Lỗi chấm điểm AI: ${err.message}`);
      setPhase('RESULT');
    }
  };

  const handlePlayAgainSameMode = () => {
    setMatchRecord(null);
    setLatestEvalDetail(null);
    setDebateStepIdx(0);
    setDebateRoundsData({});
    setPairTurnSlot('P1');
    setStatusMsg('');
    setPhase('CHECKIN');
  };

  const activeDebateStep = DEBATE_STEPS[debateStepIdx];
  const currentStepIndex =
    phase === 'CHECKIN' ? 1 : phase === 'PREP_LOCKED' ? 2 : phase === 'RECORDING' ? 3 : phase === 'GRADING' ? 4 : 5;

  const rubricItems = latestEvalDetail?.rubrics
    ? [
        { label: isVi ? 'Phát âm (IPA)' : 'Pronunciation (IPA)', val: latestEvalDetail.rubrics.pronunciation ?? 0, color: '#10B981' },
        { label: isVi ? 'Ngữ điệu (F0)' : 'Intonation (F0)', val: latestEvalDetail.rubrics.intonation ?? 0, color: '#38BDF8' },
        { label: isVi ? 'Độ trôi chảy (WPM)' : 'Fluency (WPM)', val: latestEvalDetail.rubrics.fluency ?? 0, color: '#A78BFA' },
        { label: isVi ? 'Vốn từ vựng' : 'Vocabulary', val: latestEvalDetail.rubrics.vocabulary ?? 0, color: '#34D399' },
        { label: isVi ? 'Ngữ pháp' : 'Grammar', val: latestEvalDetail.rubrics.grammar ?? 0, color: '#60A5FA' },
        { label: isVi ? 'Độ chuẩn xác nội dung' : 'Task Achievement', val: latestEvalDetail.rubrics.content ?? 0, color: '#F59E0B' },
      ]
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.innerMax}>
        {/* TOP STAGE HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backText}>← {isVi ? 'TRANG CHỦ' : 'HOME'}</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              ⚔️ {getBilingualText(tournament.title, lang)}
            </Text>
            <View style={styles.modeTag}>
              <Text style={styles.modeTagText}>{tournament.mode} ARENA</Text>
            </View>
          </View>

          <View style={styles.antiCheatBadge}>
            <Text style={styles.antiCheatText}>🛡️ Tab: {tabSwitchCount}/2</Text>
          </View>
        </View>

        {/* STEP PROGRESS BAR */}
        <View style={styles.stepperRow}>
          {[
            { step: 1, label: isVi ? '1. Check-in' : '1. Check-in' },
            { step: 2, label: isVi ? '2. Đề bài' : '2. Prompt' },
            { step: 3, label: isVi ? '3. Ghi âm' : '3. Record' },
            { step: 4, label: isVi ? '4. AI & IPA' : '4. AI & IPA' },
            { step: 5, label: isVi ? '5. Phiếu điểm' : '5. Scorecard' },
          ].map((st) => {
            const active = st.step === currentStepIndex;
            const done = st.step < currentStepIndex;
            return (
              <View
                key={st.step}
                style={[
                  styles.stepChip,
                  active && styles.stepChipActive,
                  done && styles.stepChipDone,
                ]}
              >
                <Text
                  style={[
                    styles.stepChipText,
                    active && styles.stepChipTextActive,
                    done && styles.stepChipTextDone,
                  ]}
                >
                  {st.label}
                </Text>
              </View>
            );
          })}
        </View>

        {statusMsg ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>{statusMsg}</Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
          {/* =================================================================
              GIAI ĐOẠN 1: CHECK-IN & CẤU HÌNH PHÒNG THI
             ================================================================= */}
          {phase === 'CHECKIN' && (
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>
                🎟️ {isVi ? 'XÁC THỰC HỘ CHIẾU SPEAK-ID' : 'SPEAK-ID CHECK-IN'}
              </Text>
              <Text style={styles.cardTitle}>
                {isVi
                  ? `Đăng Ký Vào Đấu Trường ${tournament.mode}`
                  : `Enter ${tournament.mode} Arena Stage`}
              </Text>
              <Text style={styles.cardSub}>{t.prep_lock_notice}</Text>

              {/* Chọn cấp độ CEFR nhanh */}
              <View style={{ marginTop: 6 }}>
                <Text style={styles.fieldLabel}>
                  {isVi ? 'Cấp độ kiểm định CEFR:' : 'Target CEFR Level:'}
                </Text>
                <View style={styles.cefrRow}>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.cefrChip, selectedCefr === lvl && styles.cefrChipActive]}
                      onPress={() => setSelectedCefr(lvl)}
                    >
                      <Text
                        style={[
                          styles.cefrChipText,
                          selectedCefr === lvl && styles.cefrChipTextActive,
                        ]}
                      >
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder={isVi ? 'Họ và tên thí sinh 1 (*)' : 'Participant 1 Full Name (*)'}
                placeholderTextColor="#64748B"
                value={studentName}
                onChangeText={setStudentName}
              />
              <TextInput
                style={styles.input}
                placeholder={isVi ? 'Mã số sinh viên 1 (VD: 2685014) (*)' : 'Student ID 1 (*)'}
                placeholderTextColor="#64748B"
                value={studentCode}
                onChangeText={setStudentCode}
              />

              {tournament.mode !== 'SOLO' && tournament.device_mode === 'SINGLE_DEVICE' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      isVi
                        ? 'Họ và tên đồng đội / đối thủ (Thí sinh 2)'
                        : 'Partner / Opponent Full Name (Player 2)'
                    }
                    placeholderTextColor="#64748B"
                    value={partnerName}
                    onChangeText={setPartnerName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={isVi ? 'Mã số sinh viên 2' : 'Student ID 2'}
                    placeholderTextColor="#64748B"
                    value={partnerCode}
                    onChangeText={setPartnerCode}
                  />
                </>
              )}

              {tournament.mode !== 'SOLO' && tournament.device_mode === 'TWO_DEVICES' && (
                <TextInput
                  style={[styles.input, { borderColor: 'rgba(56,189,248,0.5)' }]}
                  placeholder="Nhập Mã phòng 6 ký tự (Để trống nếu bạn là người tạo phòng)"
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                  value={roomCodeInput}
                  onChangeText={setRoomCodeInput}
                />
              )}

              {tournament.venue_type === 'OFFLINE' && (
                <TextInput
                  style={[styles.input, { borderColor: 'rgba(245,158,11,0.5)' }]}
                  placeholder="Mã PIN Hội trường do Ban Tổ Chức cung cấp"
                  placeholderTextColor="#64748B"
                  value={offlinePinInput}
                  onChangeText={setOfflinePinInput}
                />
              )}

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setEnableLivestream((v) => !v)}
              >
                <Text style={styles.toggleText}>
                  {enableLivestream
                    ? '🔴 Đang bật phát Live Hub cho giảng viên & lớp theo dõi'
                    : '⚪ Chế độ luyện tập cá nhân (Không phát Live)'}
                </Text>
              </TouchableOpacity>

              {enableLivestream && (
                <TextInput
                  style={styles.input}
                  placeholder="Link YouTube Live sân khấu (Tùy chọn)"
                  placeholderTextColor="#64748B"
                  value={youtubeLiveUrl}
                  onChangeText={setYoutubeLiveUrl}
                />
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                disabled={isJoining}
                onPress={handleCheckInAndCreateMatch}
              >
                {isJoining ? (
                  <ActivityIndicator color="#020617" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    🚀 {isVi ? 'XÁC NHẬN VÀO SÀN ĐẤU' : 'CONFIRM & ENTER STAGE'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* =================================================================
              GIAI ĐOẠN 2 & 3: MỞ KHÓA ĐỀ BÀI, ĐẾM NGƯỢC & THU ÂM
             ================================================================= */}
          {(phase === 'PREP_LOCKED' || phase === 'RECORDING') && matchRecord && (
            <View style={styles.card}>
              <View style={styles.stageMetaRow}>
                {matchRecord.room_code && (
                  <Text style={styles.roomBadge}>🔑 ROOM: {matchRecord.room_code}</Text>
                )}
                <Text style={styles.cefrLevelPill}>CEFR {matchRecord.cefr_level || selectedCefr}</Text>
              </View>

              {tournament.mode === 'DEBATE' ? (
                <View style={styles.turnBanner}>
                  <Text style={styles.turnBannerText}>⚖️ {activeDebateStep.label}</Text>
                </View>
              ) : (
                <View style={styles.turnBanner}>
                  <Text style={styles.turnBannerText}>
                    🎙️ {isVi ? 'LƯỢT CỦA:' : 'ACTIVE SPEAKER:'}{' '}
                    {pairTurnSlot === 'P1'
                      ? matchRecord.player1_name
                      : matchRecord.player2_name || matchRecord.player1_name}
                  </Text>
                </View>
              )}

              <View style={styles.motionBox}>
                <Text style={styles.motionLabel}>
                  📌 {isVi ? 'ĐỀ BÀI / KIẾN NGHỊ CHÍNH THỨC:' : 'OFFICIAL ARENA PROMPT:'}
                </Text>
                <Text style={styles.motionText}>{matchRecord.prompt_data?.motion_en}</Text>
                <Text style={styles.motionContext}>
                  {isVi ? matchRecord.prompt_data?.context_vi : matchRecord.prompt_data?.context_en}
                </Text>
              </View>

              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  💡 {isVi
                    ? 'Mẹo đạt điểm cao: Nói tối thiểu 2–3 câu hoàn chỉnh (≥ 18 từ), phát âm rõ âm cuối (-ed, -s) và không đọc lặp lại nguyên văn câu hỏi.'
                    : 'Tip: Speak 2–3 complete sentences (≥ 18 words), pronounce final consonants clearly, and avoid repeating the prompt.'}
                </Text>
              </View>

              {phase === 'PREP_LOCKED' ? (
                <View style={styles.timerBox}>
                  <Text style={styles.timerLabel}>
                    ⏳ {isVi ? 'THỜI GIAN CHUẨN BỊ Ý TƯỞNG (TỰ ĐỘNG BẬT MIC):' : 'PREPARATION COUNTDOWN:'}
                  </Text>
                  <Text style={styles.timerBig}>{prepSecondsLeft}s</Text>
                  <TouchableOpacity style={styles.skipPrepBtn} onPress={startTurnRecording}>
                    <Text style={styles.skipPrepText}>
                      🎙️ {isVi ? 'BẬT MIC NÓI NGAY' : 'START RECORDING NOW'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.timerBox}>
                  <Text style={[styles.timerLabel, { color: '#F87171' }]}>
                    🔴 {isVi ? 'ĐANG GHI ÂM TRỰC TIẾP:' : 'RECORDING LIVE:'}
                  </Text>
                  <Text style={[styles.timerBig, { color: '#10B981' }]}>{recordSeconds}s</Text>
                  <TouchableOpacity
                    style={styles.stopTurnBtn}
                    disabled={isDisqualified}
                    onPress={stopTurnAndSubmitToAI}
                  >
                    <Text style={styles.stopTurnText}>
                      ⏹ {isVi ? 'HOÀN THÀNH LƯỢT NÓI & CHẤM ĐIỂM AI' : 'FINISH & SUBMIT TO AI'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* =================================================================
              GIAI ĐOẠN 4: AI ĐANG CHẤM ĐIỂM & KIỂM ĐỊNH ÂM VỊ IPA
             ================================================================= */}
          {phase === 'GRADING' && (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 36 }]}>
              <ActivityIndicator size="large" color="#10B981" style={{ marginBottom: 16 }} />
              <Text style={styles.gradingTitle}>
                🤖 {isVi ? 'HỘI ĐỒNG GIÁM KHẢO AI ĐANG PHÂN TÍCH...' : 'AI EXAMINER BOARD ANALYZING...'}
              </Text>
              <Text style={styles.gradingSub}>
                {isVi
                  ? 'Đang gỡ băng Whisper, kiểm định âm vị IPA bằng Gemini Multimodal và tính điểm CEFR...'
                  : 'Transcribing speech, auditing IPA phonemes with Gemini Multimodal, and scoring CEFR rubrics...'}
              </Text>
            </View>
          )}

          {/* =================================================================
              GIAI ĐOẠN 5: PHIẾU ĐIỂM CHI TIẾT & PHÂN TÍCH ÂM VỊ IPA (GEMINI)
             ================================================================= */}
          {phase === 'RESULT' && matchRecord && (
            <View style={[styles.card, { borderColor: 'rgba(16,185,129,0.45)' }]}>
              <Text style={styles.resultEyebrow}>
                🏆 {isVi ? 'PHIẾU ĐIỂM KIỂM ĐỊNH CHÍNH THỨC' : 'OFFICIAL VERIFIED SCORECARD'}
              </Text>
              <Text style={styles.finalScoreText}>
                {matchRecord.final_score || matchRecord.player1_score} / 100
              </Text>

              {/* Điểm từng thí sinh */}
              <View style={styles.scoreSplitRow}>
                <View style={styles.splitCell}>
                  <Text style={styles.splitName}>{matchRecord.player1_name}</Text>
                  <Text style={styles.splitVal}>{matchRecord.player1_score}đ</Text>
                </View>
                {matchRecord.player2_name && (
                  <View style={styles.splitCell}>
                    <Text style={styles.splitName}>{matchRecord.player2_name}</Text>
                    <Text style={[styles.splitVal, { color: '#A78BFA' }]}>{matchRecord.player2_score}đ</Text>
                  </View>
                )}
              </View>

              {/* Bản gỡ băng nguyên văn (Transcript) */}
              {latestEvalDetail?.transcript ? (
                <View style={styles.transcriptBox}>
                  <Text style={styles.blockLabel}>
                    📜 {isVi ? 'BẢN GỠ BĂNG NGUYÊN VĂN AI GHI NHẬN:' : 'AI RECOGNIZED TRANSCRIPT:'}
                  </Text>
                  <Text style={styles.transcriptText}>"{latestEvalDetail.transcript}"</Text>
                </View>
              ) : null}

              {/* Nghe lại bản thu âm */}
              {latestEvalDetail?.audioUrl && Platform.OS === 'web' ? (
                <View style={styles.audioReplayBox}>
                  <Text style={styles.blockLabel}>
                    🎧 {isVi ? 'NGHE LẠI BẢN THU ÂM VỪA RỒI:' : 'REPLAY YOUR RECORDING:'}
                  </Text>
                  {/* @ts-ignore */}
                  <audio src={latestEvalDetail.audioUrl} controls style={{ width: '100%', height: 36, marginTop: 6 }} />
                </View>
              ) : null}

              {/* THẺ PHÂN TÍCH ÂM VỊ IPA TỪ GEMINI MULTIMODAL */}
              {latestEvalDetail?.phonemeAnalysis && (
                <View style={styles.ipaCard}>
                  <View style={styles.ipaHeaderRow}>
                    <Text style={styles.ipaTitle}>
                      🔬 {isVi ? 'KIỂM ĐỊNH ÂM VỊ IPA (GEMINI AUDIO)' : 'GEMINI IPA PHONETIC AUDIT'}
                    </Text>
                    {typeof latestEvalDetail.phonemeAnalysis.phonemeAccuracyScore === 'number' && (
                      <View style={styles.ipaScoreBadge}>
                        <Text style={styles.ipaScoreText}>
                          IPA: {Math.round(latestEvalDetail.phonemeAnalysis.phonemeAccuracyScore)}/100
                        </Text>
                      </View>
                    )}
                  </View>

                  {Array.isArray(latestEvalDetail.phonemeAnalysis.ipaHighlight) &&
                    latestEvalDetail.phonemeAnalysis.ipaHighlight.length > 0 && (
                      <View style={styles.ipaChipsWrap}>
                        {latestEvalDetail.phonemeAnalysis.ipaHighlight.map((w, idx) => (
                          <View key={idx} style={styles.ipaWordChip}>
                            <Text style={styles.ipaWordText}>{w}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                  {latestEvalDetail.phonemeAnalysis.stressAndEndingNote ? (
                    <Text style={styles.ipaNoteText}>
                      💡 {latestEvalDetail.phonemeAnalysis.stressAndEndingNote}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* BIỂU ĐỒ 6 TIÊU CHÍ RUBRICS */}
              {rubricItems.length > 0 && (
                <View style={styles.rubricSection}>
                  <Text style={styles.blockLabel}>
                    📊 {isVi ? 'ĐÁNH GIÁ 6 TIÊU CHÍ CHUẨN CEFR:' : '6 CEFR RUBRIC CRITERIA:'}
                  </Text>
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {rubricItems.map((rb, idx) => (
                      <View key={idx}>
                        <View style={styles.rubricTopRow}>
                          <Text style={styles.rubricLabel}>{rb.label}</Text>
                          <Text style={[styles.rubricVal, { color: rb.color }]}>{rb.val}/100</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.min(100, Math.max(0, rb.val))}%`, backgroundColor: rb.color },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Nhận xét tổng hợp của AI */}
              {matchRecord.ai_feedback?.vi ? (
                <View style={styles.feedbackBox}>
                  <Text style={styles.blockLabel}>
                    💬 {isVi ? 'NHẬN XÉT CHI TIẾT TỪ HỘI ĐỒNG AI:' : 'DETAILED AI FEEDBACK:'}
                  </Text>
                  <Text style={styles.feedbackSummary}>{matchRecord.ai_feedback.vi}</Text>
                </View>
              ) : null}

              <View style={styles.resultActionsRow}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={handlePlayAgainSameMode}>
                  <Text style={styles.secondaryActionText}>
                    🔄 {isVi ? 'THI ĐẤU LƯỢT MỚI' : 'NEW ROUND'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={onBack}>
                  <Text style={styles.primaryBtnText}>
                    🏠 {isVi ? 'VỀ TRANG CHỦ & HỘ CHIẾU SPEAK-ID' : 'BACK TO ECOSYSTEM & SPEAK-ID'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
    marginBottom: 12,
    gap: 10,
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
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  modeTag: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  modeTagText: { color: '#6EE7B7', fontSize: 10, fontWeight: '800' },
  antiCheatBadge: {
    backgroundColor: 'rgba(244,63,94,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.4)',
  },
  antiCheatText: { color: '#FDA4AF', fontSize: 11, fontWeight: '800' },

  stepperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  stepChip: {
    flex: 1,
    minWidth: 95,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  stepChipActive: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderColor: '#10B981',
  },
  stepChipDone: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: 'rgba(56,189,248,0.35)',
  },
  stepChipText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  stepChipTextActive: { color: '#6EE7B7', fontWeight: '900' },
  stepChipTextDone: { color: '#7DD3FC' },

  alertBanner: {
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.45)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  alertText: { color: '#FECDD3', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  card: {
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    gap: 12,
  },
  cardEyebrow: { color: '#10B981', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  cardTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  cardSub: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginBottom: 4 },
  fieldLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  cefrRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cefrChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cefrChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  cefrChipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' },
  cefrChipTextActive: { color: '#020617', fontWeight: '900' },

  input: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 13,
  },
  toggleRow: { paddingVertical: 6 },
  toggleText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },

  primaryBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: { color: '#020617', fontSize: 13, fontWeight: '900' },

  stageMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomBadge: { color: '#38BDF8', fontSize: 12, fontWeight: '900' },
  cefrLevelPill: {
    color: '#6EE7B7',
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  turnBanner: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    padding: 10,
    borderRadius: 10,
  },
  turnBannerText: { color: '#7DD3FC', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  motionBox: {
    backgroundColor: '#0B1120',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  motionLabel: { color: '#10B981', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  motionText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', lineHeight: 25, marginBottom: 8 },
  motionContext: { color: '#94A3B8', fontSize: 12.5, lineHeight: 19 },
  tipBox: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 10,
    padding: 11,
  },
  tipText: { color: '#FDE68A', fontSize: 12, lineHeight: 18 },

  timerBox: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  timerLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' },
  timerBig: { color: '#38BDF8', fontSize: 44, fontWeight: '900' },
  skipPrepBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  skipPrepText: { color: '#020617', fontSize: 12.5, fontWeight: '900' },
  stopTurnBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  stopTurnText: { color: '#020617', fontSize: 13, fontWeight: '900' },

  gradingTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  gradingSub: { color: '#94A3B8', fontSize: 12.5, textAlign: 'center', maxWidth: 480, lineHeight: 19 },

  resultEyebrow: { color: '#10B981', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  finalScoreText: { color: '#10B981', fontSize: 36, fontWeight: '900', textAlign: 'center' },
  scoreSplitRow: { flexDirection: 'row', gap: 12 },
  splitCell: {
    flex: 1,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  splitName: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  splitVal: { color: '#38BDF8', fontSize: 22, fontWeight: '900' },

  blockLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  transcriptBox: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
  },
  transcriptText: { color: '#F8FAFC', fontSize: 13.5, fontStyle: 'italic', lineHeight: 20, marginTop: 6 },
  audioReplayBox: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
  },

  ipaCard: {
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  ipaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  ipaTitle: { color: '#7DD3FC', fontSize: 12, fontWeight: '900' },
  ipaScoreBadge: {
    backgroundColor: 'rgba(56,189,248,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ipaScoreText: { color: '#BAE6FD', fontSize: 11, fontWeight: '900' },
  ipaChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ipaWordChip: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ipaWordText: { color: '#FDE68A', fontSize: 12, fontWeight: '700' },
  ipaNoteText: { color: '#E2E8F0', fontSize: 12, lineHeight: 18 },

  rubricSection: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
  },
  rubricTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rubricLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  rubricVal: { fontSize: 12, fontWeight: '900' },
  progressTrack: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },

  feedbackBox: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    borderRadius: 12,
    padding: 14,
  },
  feedbackSummary: { color: '#6EE7B7', fontSize: 12.5, lineHeight: 19, marginTop: 6 },

  resultActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  secondaryActionBtn: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: { color: '#E2E8F0', fontSize: 12.5, fontWeight: '800' },
});