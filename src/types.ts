export interface Player {
  id: string;
  name: string;
  color: string;
  score: string | number;
  isTurn?: boolean;
  isBreaker?: boolean;
  bgColor?: string;
  screenColor?: string;
  bgStyle?: string;
  screenStyle?: string;
  [key: string]: any;
}

export interface FrameDetail {
  frameNumber: number;
  breakerId?: string;
  breakerName: string;
  winnerId?: string;
  winnerName: string;
  score1: number;
  score2: number;
  timestamp: number | string;
  duration?: number;
  startTime?: string;
  endTime?: string;
  referee?: { name: string, team: '1' | '2' };
  player1Name?: string;
  player2Name?: string;
  [key: string]: any;
}

export interface MatchHistoryEntry {
  id: string;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  date: string;
  isLive?: boolean;
  isSession?: boolean;
  mode?: 'singles' | 'group' | 'match';
  team1?: string;
  team2?: string;
  frameDetails?: FrameDetail[];
  referee?: { name: string, team: '1' | '2' };
  [key: string]: any;
}

export interface MatchupSettings {
  isLive?: boolean;
  score1: number;
  score2: number;
  isStarted?: boolean;
  isFinished?: boolean;
  player1?: Partial<Player>;
  player2?: Partial<Player>;
  frameDetails?: FrameDetail[];
  referee?: { name: string, team: '1' | '2' };
  [key: string]: any;
}

export interface DeviceInfo {
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  isShort: boolean;
  shouldHideDeviceTime: boolean;
  titleSizes: {
    page: string;
    subtitle: string;
    section: string;
    tile: string;
    tileDesc: string;
  };
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}
