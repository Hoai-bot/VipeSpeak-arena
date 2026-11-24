// E:\DuAnAI\VipeSpeak-arena\App.tsx
import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from './src/utils/supabase';
import EcosystemLanding, { ArenaBattleMode } from './src/components/EcosystemLanding';
import ArenaHubScreen, { TournamentItem, LiveMatchItem } from './src/modules/tournament-core/ArenaHubScreen';
import ArenaStageScreen from './src/modules/tournament-core/ArenaStageScreen';
import DoublesPairScreen, { PairBattleMode } from './src/modules/tournament-core/DoublesPairScreen';
import LiveSpectatorModal from './src/modules/livestream-cast/LiveSpectatorModal';
import CefrAssessmentScreen from './src/modules/cefr-engine/CefrAssessmentScreen';
import PlayerProfileScreen from './src/modules/player-profile/PlayerProfileScreen';
import EventsGalleryScreen from './src/modules/events-gallery/EventsGalleryScreen';
import { AppLang } from './src/modules/i18n/translations';

class ArenaErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorMsg: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: `${error.name}: ${error.message}\n\n${error.stack || ''}` };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Arena Crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#1A000D', padding: 20 }}>
          <Text style={{ color: '#FF0055', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            🚨 LỖI RENDER GIAO DIỆN VIPESPEAK ARENA:
          </Text>
          <Text style={{ color: '#FFD700', fontSize: 12, fontFamily: 'monospace' }}>
            {this.state.errorMsg}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

type ArenaRoute = 'ECOSYSTEM' | 'HUB' | 'STAGE' | 'CEFR_TEST' | 'PROFILE' | 'LIVESTREAM' | 'EVENTS' | 'DOUBLES';

export default function App() {
  const [activeRoute, setActiveRoute] = useState<ArenaRoute>('ECOSYSTEM');
  const [appLang, setAppLang] = useState<AppLang>('vi');
  const [selectedTournament, setSelectedTournament] = useState<TournamentItem | null>(null);
  const [selectedLiveMatch, setSelectedLiveMatch] = useState<LiveMatchItem | null>(null);
  const [profileStudentCode, setProfileStudentCode] = useState<string>('');
  const [doublesInitialMode, setDoublesInitialMode] = useState<PairBattleMode>('RELAY');
  const [isLaunchingArena, setIsLaunchingArena] = useState<boolean>(false);

  // Mở trực tiếp 1 trong 4 thể thức (SOLO / RELAY / ROLEPLAY / DEBATE) với bản ghi Tournament thực trên Supabase
  const handleSelectBattleMode = async (battleMode: ArenaBattleMode) => {
    setIsLaunchingArena(true);
    try {
      let resolvedTournament: TournamentItem | null = null;

      if (supabase) {
        const { data: existingList } = await supabase
          .from('tournaments')
          .select('*')
          .eq('mode', battleMode)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingList && existingList.length > 0) {
          resolvedTournament = existingList[0] as TournamentItem;
        } else {
          const defaultTitle = {
            vi: `Đấu Trường ${battleMode} Chuẩn CEFR 2026`,
            en: `CEFR Official ${battleMode} Arena 2026`,
          };
          const { data: createdTourney } = await supabase
            .from('tournaments')
            .insert([
              {
                title: defaultTitle,
                mode: battleMode,
                cefr_level: 'B1',
                venue_type: 'ONLINE',
                device_mode: 'SINGLE_DEVICE',
                status: 'OPEN',
              },
            ])
            .select()
            .single();

          if (createdTourney) {
            resolvedTournament = createdTourney as TournamentItem;
          }
        }
      }

      if (!resolvedTournament) {
        resolvedTournament = {
          id: `fallback-${battleMode.toLowerCase()}`,
          title: {
            vi: `Đấu Trường ${battleMode} Chuẩn CEFR`,
            en: `CEFR ${battleMode} Arena`,
          },
          mode: battleMode,
          cefr_level: 'B1',
          venue_type: 'ONLINE',
          device_mode: 'SINGLE_DEVICE',
          status: 'OPEN',
        } as unknown as TournamentItem;
      }

      setSelectedTournament(resolvedTournament);
      setActiveRoute('STAGE');
    } finally {
      setIsLaunchingArena(false);
    }
  };

  return (
    <ArenaErrorBoundary>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

        {/* Overlay tải nhanh khi khởi tạo phòng thi */}
        {isLaunchingArena && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>
              {appLang === 'vi'
                ? '⚡ Đang kết nối Sàn Đấu & Đồng bộ Supabase...'
                : '⚡ Connecting Arena Stage & Syncing Supabase...'}
            </Text>
          </View>
        )}

        {/* Thanh điều hướng nhanh quay về Trang Chủ Hệ Sinh Thái */}
        {activeRoute !== 'ECOSYSTEM' && (
          <View style={styles.quickHomeBar}>
            <TouchableOpacity
              style={styles.quickHomeBtn}
              onPress={() => setActiveRoute('ECOSYSTEM')}
            >
              <Text style={styles.quickHomeText}>
                🏠 {appLang === 'vi' ? 'Trang Chủ Hệ Sinh Thái' : 'Ecosystem Home'}
              </Text>
            </TouchableOpacity>

            <View style={styles.quickNavGroup}>
              <TouchableOpacity onPress={() => setActiveRoute('HUB')}>
                <Text style={styles.quickNavLink}>
                  ⚔️ {appLang === 'vi' ? 'Sảnh Giải Đấu' : 'Arena Hub'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDoublesInitialMode('RELAY');
                  setActiveRoute('DOUBLES');
                }}
              >
                <Text style={[styles.quickNavLink, { color: '#6EE7B7' }]}>
                  🤝 {appLang === 'vi' ? 'Ghép Cặp Relay/Roleplay' : 'Doubles Match'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveRoute('EVENTS')}>
                <Text style={styles.quickNavLink}>
                  📅 {appLang === 'vi' ? 'Sự Kiện & Ảnh Giải' : 'Events & Gallery'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveRoute('CEFR_TEST')}>
                <Text style={styles.quickNavLink}>
                  🎙️ {appLang === 'vi' ? 'Kiểm Định CEFR' : 'CEFR Lab'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveRoute('PROFILE')}>
                <Text style={styles.quickNavLink}>
                  🪪 {appLang === 'vi' ? 'Hộ Chiếu SPEAK-ID' : 'SPEAK-ID'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeRoute === 'ECOSYSTEM' && (
          <EcosystemLanding
            lang={appLang}
            onChangeLang={setAppLang}
            onSelectBattleMode={handleSelectBattleMode}
            onNavigateDoubles={(pairMode) => {
              if (pairMode) setDoublesInitialMode(pairMode);
              setActiveRoute('DOUBLES');
            }}
            onNavigateHub={() => setActiveRoute('HUB')}
            onNavigateEvents={() => setActiveRoute('EVENTS')}
            onNavigateCefrTest={() => setActiveRoute('CEFR_TEST')}
            onNavigateProfile={(code) => {
              if (code) setProfileStudentCode(code);
              setActiveRoute('PROFILE');
            }}
          />
        )}

        {activeRoute === 'HUB' && (
          <ArenaHubScreen
            onNavigateCefrTest={() => setActiveRoute('CEFR_TEST')}
            onNavigateProfile={() => setActiveRoute('PROFILE')}
            onEnterMatchStage={(tourney) => {
              setSelectedTournament(tourney);
              setActiveRoute('STAGE');
            }}
            onWatchLivestream={(match) => {
              setSelectedLiveMatch(match);
              setActiveRoute('LIVESTREAM');
            }}
          />
        )}

        {activeRoute === 'DOUBLES' && (
          <DoublesPairScreen
            initialMode={doublesInitialMode}
            onBack={() => setActiveRoute('ECOSYSTEM')}
            onLaunchTeamMatch={(teamData) => {
              setSelectedTournament({
                id: `team-${teamData.teamCode.toLowerCase()}`,
                title: {
                  vi: `Đấu Đội ${teamData.mode} (${teamData.player1.fullName} & ${teamData.player2.fullName}) • Bảng ${teamData.divisionCefr}`,
                  en: `${teamData.mode} Team Match (${teamData.teamCode}) • Division ${teamData.divisionCefr}`,
                },
                mode: teamData.mode,
                cefr_level: teamData.divisionCefr,
                venue_type: 'ONLINE',
                device_mode: 'SINGLE_DEVICE',
                status: 'OPEN',
              } as unknown as TournamentItem);
              setActiveRoute('STAGE');
            }}
          />
        )}

        {activeRoute === 'EVENTS' && (
          <EventsGalleryScreen
            onBack={() => setActiveRoute('ECOSYSTEM')}
            onEnterTournamentStage={(tourney) => {
              setSelectedTournament(tourney);
              setActiveRoute('STAGE');
            }}
          />
        )}

        {activeRoute === 'STAGE' && selectedTournament && (
          <ArenaStageScreen
            tournament={selectedTournament}
            lang={appLang}
            onBack={() => setActiveRoute('ECOSYSTEM')}
          />
        )}

        {activeRoute === 'LIVESTREAM' && selectedLiveMatch && (
          <LiveSpectatorModal match={selectedLiveMatch} onClose={() => setActiveRoute('HUB')} />
        )}

        {activeRoute === 'CEFR_TEST' && (
          <CefrAssessmentScreen
            onBack={() => setActiveRoute('ECOSYSTEM')}
            onCompletedNavigateProfile={(code) => {
              setProfileStudentCode(code);
              setActiveRoute('PROFILE');
            }}
          />
        )}

        {activeRoute === 'PROFILE' && (
          <PlayerProfileScreen
            initialStudentCode={profileStudentCode}
            onBack={() => setActiveRoute('ECOSYSTEM')}
            onNavigateEvents={() => setActiveRoute('EVENTS')}
          />
        )}
      </View>
    </ArenaErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0B1120',
    ...(Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : {}),
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    backgroundColor: 'rgba(11, 17, 32, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6EE7B7',
    fontSize: 13,
    fontWeight: '800',
  },
  quickHomeBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickHomeBtn: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickHomeText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '800',
  },
  quickNavGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  quickNavLink: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
});