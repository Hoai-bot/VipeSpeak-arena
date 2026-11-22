// src/modules/tournament-core/ArenaStageScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '../../utils/supabase';
import { TournamentItem } from './ArenaHubScreen';
import { useArenaAntiCheat } from '../anti-cheat/useArenaAntiCheat';
import { ARENA_TRANSLATIONS, AppLang, getBilingualText } from '../i18n/translations';

interface Props {
  tournament: TournamentItem;
  lang?: AppLang;
  onBack: () => void;
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

  // Bước 1: Check-in thí sinh & tạo/vào phòng đấu
  const [studentName, setStudentName] = useState<string>('');
  const [studentCode, setStudentCode] = useState<string>('');
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

  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // 🛡️ Kích hoạt giám sát chống chuyển tab ngay khi đề bài mở khóa
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

  // Đồng hồ đếm ngược 15 giây chuẩn bị (hết giờ tự động bật Micro)
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
      setStatusMsg('⚠️ Vui lòng nhập đầy đủ Họ tên và Mã số sinh viên (MSSV)!');
      return;
    }
    if (!supabase) return;

    setIsJoining(true);
    setStatusMsg('');
    try {
      const cleanCode = studentCode.trim().toUpperCase();
      const cleanName = studentName.trim();

      // 1. Ghi sổ cái bất biến tournament_participants (tự động tính hoa hồng % qua Trigger SQL)
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

      // 2. Nếu thí sinh nhập Mã phòng 6 ký tự có sẵn -> Tham gia vào vị trí P2 (Online 2 thiết bị)
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

      // 3. Tạo trận đấu mới (Solo / Offline 1 máy / Online tạo phòng mới)
      const levelPool = SAMPLE_MOTIONS_BY_LEVEL[tournament.cefr_level] || SAMPLE_MOTIONS_BY_LEVEL.B1;
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
            cefr_level: tournament.cefr_level === 'OPEN' ? 'B1' : tournament.cefr_level,
            player1_code: cleanCode,
            player1_name: cleanName,
            player2_code: isSingleDevicePair ? (partnerCode.trim().toUpperCase() || 'PARTNER_B') : null,
            player2_name: isSingleDevicePair ? (partnerName.trim() || 'Thí sinh B') : null,
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
      const turnScore = Number(evalJson?.score || 0);
      const turnTranscript = evalJson?.transcript || '';
      const turnFeedback = evalJson?.feedback || '';

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
          },
        };
        setDebateRoundsData(updatedRounds);

        // Nếu chưa hết 6 lượt Debate -> chuyển sang lượt tiếp theo
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

        // Tổng kết cả 3 vòng Debate
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

  const activeDebateStep = DEBATE_STEPS[debateStepIdx];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>🔙 SẢNH</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          ⚔️ {getBilingualText(tournament.title, lang)} ({tournament.mode})
        </Text>
        <View style={styles.antiCheatBadge}>
          <Text style={styles.antiCheatText}>🛡️ Tab Switch: {tabSwitchCount}/2</Text>
        </View>
      </View>

      {statusMsg ? (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{statusMsg}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* GIAI ĐOẠN 1: CHECK-IN & CẤU HÌNH PHÒNG THI */}
        {phase === 'CHECKIN' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎟️ CHECK-IN THI ĐẤU ({tournament.venue_type})</Text>
            <Text style={styles.cardSub}>{t.prep_lock_notice}</Text>

            <TextInput
              style={styles.input}
              placeholder="Họ và tên thí sinh 1 (*)"
              placeholderTextColor="#666688"
              value={studentName}
              onChangeText={setStudentName}
            />
            <TextInput
              style={styles.input}
              placeholder="Mã số sinh viên 1 (*)"
              placeholderTextColor="#666688"
              value={studentCode}
              onChangeText={setStudentCode}
            />

            {tournament.mode !== 'SOLO' && tournament.device_mode === 'SINGLE_DEVICE' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Họ và tên đồng đội / đối thủ (Thí sinh 2)"
                  placeholderTextColor="#666688"
                  value={partnerName}
                  onChangeText={setPartnerName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mã số sinh viên 2"
                  placeholderTextColor="#666688"
                  value={partnerCode}
                  onChangeText={setPartnerCode}
                />
              </>
            )}

            {tournament.mode !== 'SOLO' && tournament.device_mode === 'TWO_DEVICES' && (
              <TextInput
                style={[styles.input, { borderColor: '#00FFFF' }]}
                placeholder="Nhập Mã phòng 6 ký tự (Để trống nếu bạn là người tạo phòng)"
                placeholderTextColor="#666688"
                autoCapitalize="characters"
                value={roomCodeInput}
                onChangeText={setRoomCodeInput}
              />
            )}

            {tournament.venue_type === 'OFFLINE' && (
              <TextInput
                style={[styles.input, { borderColor: '#FFD700' }]}
                placeholder="Mã PIN Hội trường do Ban Tổ Chức cung cấp"
                placeholderTextColor="#666688"
                value={offlinePinInput}
                onChangeText={setOfflinePinInput}
              />
            )}

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setEnableLivestream((v) => !v)}
            >
              <Text style={styles.toggleText}>
                {enableLivestream ? '🔴 Đang bật phát Livestream cho khán giả theo dõi' : '⚪ Tắt Livestream (Thi kín)'}
              </Text>
            </TouchableOpacity>

            {enableLivestream && (
              <TextInput
                style={styles.input}
                placeholder="Link YouTube Live sân khấu (Tùy chọn)"
                placeholderTextColor="#666688"
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
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>🚀 XÁC NHẬN VÀO SÀN ĐẤU</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* GIAI ĐOẠN 2 & 3: MỞ KHÓA ĐỀ BÀI, ĐẾM NGƯỢC & THU ÂM */}
        {(phase === 'PREP_LOCKED' || phase === 'RECORDING') && matchRecord && (
          <View style={styles.card}>
            {matchRecord.room_code && (
              <Text style={styles.roomBadge}>🔑 MÃ PHÒNG ĐẤU: {matchRecord.room_code}</Text>
            )}

            {tournament.mode === 'DEBATE' ? (
              <Text style={styles.turnBanner}>⚖️ {activeDebateStep.label}</Text>
            ) : (
              <Text style={styles.turnBanner}>
                🎙️ LƯỢT CỦA: {pairTurnSlot === 'P1' ? matchRecord.player1_name : matchRecord.player2_name || matchRecord.player1_name}
              </Text>
            )}

            <View style={styles.motionBox}>
              <Text style={styles.motionLabel}>📌 ĐỀ BÀI / KIẾN NGHỊ CHÍNH THỨC:</Text>
              <Text style={styles.motionText}>{matchRecord.prompt_data?.motion_en}</Text>
              <Text style={styles.motionContext}>
                {lang === 'vi' ? matchRecord.prompt_data?.context_vi : matchRecord.prompt_data?.context_en}
              </Text>
            </View>

            {phase === 'PREP_LOCKED' ? (
              <View style={styles.timerBox}>
                <Text style={styles.timerLabel}>⏳ THỜI GIAN CHUẨN BỊ Ý TƯỞNG (TỰ ĐỘNG BẬT MIC):</Text>
                <Text style={styles.timerBig}>{prepSecondsLeft}s</Text>
                <TouchableOpacity style={styles.skipPrepBtn} onPress={startTurnRecording}>
                  <Text style={styles.skipPrepText}>🎙️ NÓI NGAY LẬP TỨC</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.timerBox}>
                <Text style={[styles.timerLabel, { color: '#FF0055' }]}>🔴 ĐANG GHI ÂM TRỰC TIẾP:</Text>
                <Text style={[styles.timerBig, { color: '#39FF14' }]}>{recordSeconds}s</Text>
                <TouchableOpacity
                  style={styles.stopTurnBtn}
                  disabled={isDisqualified}
                  onPress={stopTurnAndSubmitToAI}
                >
                  <Text style={styles.stopTurnText}>⏹ HOÀN THÀNH LƯỢT NÓI & CHẤM ĐIỂM</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* GIAI ĐOẠN 4: AI ĐANG CHẤM ĐIỂM */}
        {phase === 'GRADING' && (
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#00FFFF" style={{ marginVertical: 20 }} />
            <Text style={styles.gradingText}>
              🤖 HỘI ĐỒNG GIÁM KHẢO AI ĐANG PHÂN TÍCH PHÁT ÂM, TỐC ĐỘ WPM & LẬP LUẬN...
            </Text>
          </View>
        )}

        {/* GIAI ĐOẠN 5: CÔNG BỐ KẾT QUẢ TRẬN ĐẤU */}
        {phase === 'RESULT' && matchRecord && (
          <View style={[styles.card, { borderColor: '#39FF14' }]}>
            <Text style={styles.resultHeader}>🏆 KẾT QUẢ TRẬN ĐẤU CHÍNH THỨC</Text>
            <Text style={styles.finalScoreText}>{matchRecord.final_score || matchRecord.player1_score} / 100 ĐIỂM</Text>

            <View style={styles.scoreSplitRow}>
              <View style={styles.splitCell}>
                <Text style={styles.splitName}>{matchRecord.player1_name}</Text>
                <Text style={styles.splitVal}>{matchRecord.player1_score}đ</Text>
              </View>
              {matchRecord.player2_name && (
                <View style={styles.splitCell}>
                  <Text style={styles.splitName}>{matchRecord.player2_name}</Text>
                  <Text style={[styles.splitVal, { color: '#FF007F' }]}>{matchRecord.player2_score}đ</Text>
                </View>
              )}
            </View>

            {matchRecord.ai_feedback?.vi ? (
              <Text style={styles.feedbackSummary}>{matchRecord.ai_feedback.vi}</Text>
            ) : null}

            <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
              <Text style={styles.primaryBtnText}>🏟️ QUAY VỀ SẢNH & BẢNG XẾP HẠNG</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05020D', padding: 16, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  backBtn: { padding: 8, backgroundColor: '#0D0620', borderRadius: 8, borderWidth: 1, borderColor: '#00FFFF' },
  backText: { color: '#00FFFF', fontSize: 10, fontWeight: 'bold' },
  headerTitle: { color: '#FFD700', fontSize: 11.5, fontWeight: '900', flex: 1, textAlign: 'center' },
  antiCheatBadge: { backgroundColor: '#1E0B36', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#FF0055' },
  antiCheatText: { color: '#FF0055', fontSize: 9, fontWeight: '900' },

  alertBanner: { backgroundColor: 'rgba(255, 0, 85, 0.18)', borderWidth: 1, borderColor: '#FF0055', padding: 10, borderRadius: 8, marginBottom: 12 },
  alertText: { color: '#FF0055', fontSize: 10.5, fontWeight: 'bold', textAlign: 'center' },

  card: { backgroundColor: '#0D0620', borderRadius: 16, borderWidth: 1.5, borderColor: '#00FFFF', padding: 16, gap: 10 },
  cardTitle: { color: '#FFD700', fontSize: 13.5, fontWeight: '900', textAlign: 'center' },
  cardSub: { color: '#AAAABB', fontSize: 10, textAlign: 'center', marginBottom: 4 },
  input: { backgroundColor: '#070212', borderWidth: 1, borderColor: '#332255', borderRadius: 8, padding: 10, color: '#FFF', fontSize: 11.5 },
  toggleRow: { paddingVertical: 6 },
  toggleText: { color: '#00FFFF', fontSize: 10.5, fontWeight: 'bold' },

  primaryBtn: { backgroundColor: '#39FF14', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#000', fontSize: 11.5, fontWeight: '900' },

  roomBadge: { color: '#00FFFF', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  turnBanner: { backgroundColor: '#1E0B36', color: '#FFD700', padding: 8, borderRadius: 8, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  motionBox: { backgroundColor: '#130628', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#332255' },
  motionLabel: { color: '#00FFFF', fontSize: 9.5, fontWeight: 'bold', marginBottom: 4 },
  motionText: { color: '#FFF', fontSize: 14, fontWeight: '900', lineHeight: 20, marginBottom: 6 },
  motionContext: { color: '#B0B0CC', fontSize: 10.5, fontStyle: 'italic' },

  timerBox: { alignItems: 'center', paddingVertical: 14, gap: 8 },
  timerLabel: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
  timerBig: { color: '#00FFFF', fontSize: 36, fontWeight: '900' },
  skipPrepBtn: { backgroundColor: '#FF007F', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  skipPrepText: { color: '#FFF', fontSize: 10.5, fontWeight: '900' },
  stopTurnBtn: { backgroundColor: '#39FF14', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  stopTurnText: { color: '#000', fontSize: 11.5, fontWeight: '900' },

  gradingText: { color: '#00FFFF', fontSize: 11.5, fontWeight: 'bold', textAlign: 'center', lineHeight: 18 },
  resultHeader: { color: '#FFD700', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  finalScoreText: { color: '#39FF14', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  scoreSplitRow: { flexDirection: 'row', gap: 10, marginVertical: 6 },
  splitCell: { flex: 1, backgroundColor: '#130628', padding: 12, borderRadius: 10, alignItems: 'center' },
  splitName: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  splitVal: { color: '#00FFFF', fontSize: 18, fontWeight: '900' },
  feedbackSummary: { color: '#E0E0F5', fontSize: 11, lineHeight: 16, backgroundColor: '#070212', padding: 10, borderRadius: 8 },
});