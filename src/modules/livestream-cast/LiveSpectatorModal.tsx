// src/modules/livestream-cast/LiveSpectatorModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../../utils/supabase';
import { LiveMatchItem } from '../tournament-core/ArenaHubScreen';

interface Props {
  match: LiveMatchItem;
  onClose: () => void;
}

function getVoterFingerprint(): string {
  if (typeof window === 'undefined' || !window.localStorage) return `anon_${Date.now()}`;
  let fp = window.localStorage.getItem('vibespeak_arena_voter_fp');
  if (!fp) {
    fp = `voter_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
    window.localStorage.setItem('vibespeak_arena_voter_fp', fp);
  }
  return fp;
}

function convertToYouTubeEmbed(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1` : null;
}

export default function LiveSpectatorModal({ match, onClose }: Props) {
  const [liveData, setLiveData] = useState<any>(match);
  const [hasVoted, setHasVoted] = useState<'P1' | 'P2' | null>(null);
  const [voting, setVoting] = useState<boolean>(false);
  const [voteNotice, setVoteNotice] = useState<string>('');

  useEffect(() => {
    if (!supabase) return;

    // Tải chi tiết trận đấu mới nhất
    supabase
      .from('matches')
      .select('*')
      .eq('id', match.id)
      .single()
      .then(({ data }) => {
        if (data) setLiveData(data);
      });

    // Kiểm tra xem khán giả này đã bình chọn cho trận này chưa
    const fp = getVoterFingerprint();
    supabase
      .from('match_votes')
      .select('voted_for')
      .eq('match_id', match.id)
      .eq('voter_fingerprint', fp)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.voted_for) setHasVoted(data.voted_for as 'P1' | 'P2');
      });

    // Lắng nghe thay đổi điểm số, audio lượt nói và số phiếu bình chọn theo thời gian thực
    const channel = supabase
      .channel(`spectator-match-${match.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
        (payload) => {
          if (payload.new) setLiveData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  const handleVote = async (side: 'P1' | 'P2') => {
    if (hasVoted || voting || !supabase) return;
    setVoting(true);
    setVoteNotice('');
    try {
      const fp = getVoterFingerprint();
      const { error } = await supabase.from('match_votes').insert([
        {
          match_id: match.id,
          voter_fingerprint: fp,
          voted_for: side,
        },
      ]);

      if (error) {
        setVoteNotice('⚠️ Thiết bị của bạn đã bình chọn cho trận đấu này rồi.');
        setHasVoted(side);
        return;
      }

      const nextP1 = (liveData.audience_votes_p1 || 0) + (side === 'P1' ? 1 : 0);
      const nextP2 = (liveData.audience_votes_p2 || 0) + (side === 'P2' ? 1 : 0);

      await supabase
        .from('matches')
        .update({ audience_votes_p1: nextP1, audience_votes_p2: nextP2 })
        .eq('id', match.id);

      setHasVoted(side);
      setVoteNotice('✅ Đã ghi nhận phiếu bình chọn của bạn!');
    } finally {
      setVoting(false);
    }
  };

  const embedUrl = convertToYouTubeEmbed(liveData.live_stream_url);
  const totalVotes = Math.max(1, (liveData.audience_votes_p1 || 0) + (liveData.audience_votes_p2 || 0));
  const p1Pct = Math.round(((liveData.audience_votes_p1 || 0) / totalVotes) * 100);
  const p2Pct = 100 - p1Pct;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
          <Text style={styles.backText}>🔙 SẢNH GIẢI ĐẤU</Text>
        </TouchableOpacity>
        <Text style={styles.liveTitle}>🔴 LIVESTREAM • {liveData.mode} ({liveData.cefr_level})</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{liveData.live_status || 'LIVE'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        {/* LỚP 2: NHÚNG VIDEO SÂN KHẤU NẾU BAN TỔ CHỨC GẮN LINK YOUTUBE LIVE */}
        {embedUrl && (
          <View style={styles.videoWrapper}>
            {React.createElement('iframe', {
              src: embedUrl,
              style: { width: '100%', height: '240px', border: 'none', borderRadius: '12px' },
              allow: 'autoplay; encrypted-media',
              allowFullScreen: true,
            })}
          </View>
        )}

        {/* ĐỀ BÀI / KIẾN NGHỊ TRANH BIỆN ĐANG THI ĐẤU */}
        <View style={styles.promptCard}>
          <Text style={styles.promptLabel}>📌 CHỦ ĐỀ / KIẾN NGHỊ TRẬN ĐẤU:</Text>
          <Text style={styles.promptText}>
            {liveData.prompt_data?.motion_en || liveData.prompt_data?.prompt_en || 'Đang cập nhật đề bài trực tiếp...'}
          </Text>
        </View>

        {/* BẢNG ĐIỂM ĐỐI ĐẦU THỜI GIAN THỰC */}
        <View style={styles.versusRow}>
          <View style={[styles.playerCard, { borderColor: '#00FFFF' }]}>
            <Text style={styles.sideTag}>{liveData.mode === 'DEBATE' ? 'PHE ỦNG HỘ (PRO)' : 'THÍ SINH 1'}</Text>
            <Text style={styles.playerName}>{liveData.player1_name}</Text>
            <Text style={[styles.playerScore, { color: '#00FFFF' }]}>{liveData.player1_score || 0}đ</Text>
            {liveData.player1_audio_url ? (
              <View style={{ width: '100%', marginTop: 6 }}>
                {React.createElement('audio', {
                  controls: true,
                  src: liveData.player1_audio_url,
                  style: { width: '100%', height: 32 },
                })}
              </View>
            ) : null}
          </View>

          {liveData.player2_name ? (
            <View style={[styles.playerCard, { borderColor: '#FF007F' }]}>
              <Text style={[styles.sideTag, { color: '#FF007F' }]}>
                {liveData.mode === 'DEBATE' ? 'PHE PHẢN ĐỐI (CON)' : 'THÍ SINH 2'}
              </Text>
              <Text style={styles.playerName}>{liveData.player2_name}</Text>
              <Text style={[styles.playerScore, { color: '#FF007F' }]}>{liveData.player2_score || 0}đ</Text>
              {liveData.player2_audio_url ? (
                <View style={{ width: '100%', marginTop: 6 }}>
                  {React.createElement('audio', {
                    controls: true,
                    src: liveData.player2_audio_url,
                    style: { width: '100%', height: 32 },
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* KHUNG BÌNH CHỌN KHÁN GIẢ (CHỐNG BOT 1 THIẾT BỊ / 1 PHIẾU) */}
        {liveData.player2_name && (
          <View style={styles.voteBox}>
            <Text style={styles.voteTitle}>👏 BÌNH CHỌN KHÁN GIẢ TRỰC TIẾP (1 PHIẾU / KHÁN GIẢ)</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFillP1, { width: `${p1Pct}%` }]} />
              <View style={[styles.progressFillP2, { width: `${p2Pct}%` }]} />
            </View>
            <View style={styles.voteCountRow}>
              <Text style={{ color: '#00FFFF', fontSize: 10, fontWeight: 'bold' }}>
                {liveData.player1_name}: {liveData.audience_votes_p1 || 0} phiếu ({p1Pct}%)
              </Text>
              <Text style={{ color: '#FF007F', fontSize: 10, fontWeight: 'bold' }}>
                {liveData.player2_name}: {liveData.audience_votes_p2 || 0} phiếu ({p2Pct}%)
              </Text>
            </View>

            <View style={styles.voteBtnRow}>
              <TouchableOpacity
                style={[styles.voteBtn, { backgroundColor: '#00FFFF' }, hasVoted && { opacity: 0.5 }]}
                disabled={Boolean(hasVoted) || voting}
                onPress={() => handleVote('P1')}
              >
                <Text style={styles.voteBtnText}>
                  {hasVoted === 'P1' ? '✅ ĐÃ CHỌN P1' : `👏 CỔ VŨ ${liveData.player1_name}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.voteBtn, { backgroundColor: '#FF007F' }, hasVoted && { opacity: 0.5 }]}
                disabled={Boolean(hasVoted) || voting}
                onPress={() => handleVote('P2')}
              >
                <Text style={[styles.voteBtnText, { color: '#FFF' }]}>
                  {hasVoted === 'P2' ? '✅ ĐÃ CHỌN P2' : `🔥 CỔ VŨ ${liveData.player2_name}`}
                </Text>
              </TouchableOpacity>
            </View>
            {voteNotice ? <Text style={styles.voteNotice}>{voteNotice}</Text> : null}
          </View>
        )}

        {/* NHẬN XÉT AI & DIỄN BIẾN TRẬN ĐẤU */}
        {liveData.ai_feedback?.vi ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackHeader}>🤖 NHẬN XÉT TỪ HỘI ĐỒNG GIÁM KHẢO AI:</Text>
            <Text style={styles.feedbackBody}>{liveData.ai_feedback.vi}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05020D', padding: 16, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  backBtn: { padding: 8, backgroundColor: '#0D0620', borderRadius: 8, borderWidth: 1, borderColor: '#00FFFF' },
  backText: { color: '#00FFFF', fontSize: 10, fontWeight: 'bold' },
  liveTitle: { color: '#FF0055', fontSize: 11.5, fontWeight: '900' },
  statusBadge: { backgroundColor: '#1E0B36', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#39FF14' },
  statusBadgeText: { color: '#39FF14', fontSize: 9, fontWeight: '900' },

  videoWrapper: { marginBottom: 14, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FF0055' },
  promptCard: { backgroundColor: '#0D0620', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FFD700', marginBottom: 14 },
  promptLabel: { color: '#FFD700', fontSize: 9.5, fontWeight: '900', marginBottom: 4 },
  promptText: { color: '#FFF', fontSize: 12.5, fontWeight: 'bold', lineHeight: 18 },

  versusRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  playerCard: { flex: 1, backgroundColor: '#0D0620', borderRadius: 12, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  sideTag: { color: '#00FFFF', fontSize: 8.5, fontWeight: '900', marginBottom: 4 },
  playerName: { color: '#FFF', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  playerScore: { fontSize: 20, fontWeight: '900' },

  voteBox: { backgroundColor: '#130628', borderRadius: 12, borderWidth: 1.5, borderColor: '#332255', padding: 14, marginBottom: 14 },
  voteTitle: { color: '#FFD700', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  progressTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#221144', marginBottom: 6 },
  progressFillP1: { backgroundColor: '#00FFFF', height: '100%' },
  progressFillP2: { backgroundColor: '#FF007F', height: '100%' },
  voteCountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  voteBtnRow: { flexDirection: 'row', gap: 10 },
  voteBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  voteBtnText: { color: '#000', fontSize: 10, fontWeight: '900' },
  voteNotice: { color: '#39FF14', fontSize: 9.5, textAlign: 'center', marginTop: 8, fontWeight: 'bold' },

  feedbackCard: { backgroundColor: '#092B1E', borderRadius: 12, borderWidth: 1, borderColor: '#39FF14', padding: 12 },
  feedbackHeader: { color: '#39FF14', fontSize: 10, fontWeight: '900', marginBottom: 4 },
  feedbackBody: { color: '#E0FFE8', fontSize: 10.5, lineHeight: 16 },
});