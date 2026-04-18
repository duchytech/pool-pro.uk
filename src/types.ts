export interface Player {
  id: string;
  name: string;
  score: number;
  isTurn: boolean;
  color: string;
  bgColor: string;
  screenColor: string;
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

export interface MatchHistoryEntry {
  id: string;
  date: string;
  player1: string;
  player2: string;
  team1?: string;
  team2?: string;
  score1: number;
  score2: number;
  winner: string;
  shotClockSetting?: number;
  matchClockRemaining?: number;
}
