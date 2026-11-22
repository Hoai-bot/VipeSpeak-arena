// E:\DuAnAI\VipeSpeak-arena\App.tsx
import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { StatusBar, StyleSheet, View, Text, Platform, ScrollView } from 'react-native';
import ArenaHubScreen, { TournamentItem, LiveMatchItem } from './src/modules/tournament-core/ArenaHubScreen';
import ArenaStageScreen from './src/modules/tournament-core/ArenaStageScreen';
import LiveSpectatorModal from './src/modules/livestream-cast/LiveSpectatorModal';
import CefrAssessmentScreen from './src/modules/cefr-engine/CefrAssessmentScreen';
import PlayerProfileScreen from './src/modules/player-profile/PlayerProfileScreen';

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

type ArenaRoute = 'HUB' | 'STAGE' | 'CEFR_TEST' | 'PROFILE' | 'LIVESTREAM';

export default function App() {
  const [activeRoute, setActiveRoute] = useState<ArenaRoute>('HUB');
  const [selectedTournament, setSelectedTournament] = useState<TournamentItem | null>(null);
  const [selectedLiveMatch, setSelectedLiveMatch] = useState<LiveMatchItem | null>(null);
  const [profileStudentCode, setProfileStudentCode] = useState<string>('');

  return (
    <ArenaErrorBoundary>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#05020D" />

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

        {activeRoute === 'STAGE' && selectedTournament && (
          <ArenaStageScreen tournament={selectedTournament} onBack={() => setActiveRoute('HUB')} />
        )}

        {activeRoute === 'LIVESTREAM' && selectedLiveMatch && (
          <LiveSpectatorModal match={selectedLiveMatch} onClose={() => setActiveRoute('HUB')} />
        )}

        {activeRoute === 'CEFR_TEST' && (
          <CefrAssessmentScreen
            onBack={() => setActiveRoute('HUB')}
            onCompletedNavigateProfile={(code) => {
              setProfileStudentCode(code);
              setActiveRoute('PROFILE');
            }}
          />
        )}

        {activeRoute === 'PROFILE' && (
          <PlayerProfileScreen initialStudentCode={profileStudentCode} onBack={() => setActiveRoute('HUB')} />
        )}
      </View>
    </ArenaErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#05020D',
    ...(Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : {}),
  },
});