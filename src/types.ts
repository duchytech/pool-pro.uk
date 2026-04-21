export interface Player {
  id: string;
  name: string;
  score: number;
  isTurn: boolean;
  color: string;
  bgColor: string;
  screenColor: string;
  bgStyle?: 'default' | 'balls' | 'cloth';
  screenStyle?: 'default' | 'balls' | 'cloth';
}

export interface MatchupSettings {
  player1: {
    color: string;
    bgColor: string;
    screenColor: string;
  };
  player2: {
    color: string;
    bgColor: string;
    screenColor: string;
  };
  score1?: number;
  score2?: number;
}

export interface FrameDetail {
  frameNumber: number;
  startTime?: string;
  timestamp: string;
  score1: number;
  score2: number;
  breakerId: string;
  breakerName: string;
  winnerId?: string;
  winnerName?: string;
  duration?: number; // in seconds
}

export interface MatchHistoryEntry {
  id: string;
  date: string;
  startTime?: string;
  player1: string;
  player2: string;
  team1?: string;
  team2?: string;
  score1: number;
  score2: number;
  winner: string;
  shotClockSetting?: number;
  matchClockRemaining?: number;
  frameDetails?: FrameDetail[];
}
