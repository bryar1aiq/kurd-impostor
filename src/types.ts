import type { KurdishWord } from "./data/kurdishWords";

export type Role = "civilian" | "impostor" | "mrWhite";

export interface Player {
  id: string;
  name: string;
  role: Role;
  word: KurdishWord | null;  // null for Mr. White
  isEliminated: boolean;
  votesReceived: number;
}

export type GamePhase =
  | "setup"        // Select players, configure
  | "roleReveal"   // Pass device - each player sees their role/word
  | "discussion"   // Players discuss (optional timer)
  | "voting"       // Vote for impostor
  | "roundEnd"     // Show who was eliminated
  | "gameOver";    // Win/lose screen

export interface GameState {
  phase: GamePhase;
  playerCount: number;
  players: Player[];
  civilWord: KurdishWord;
  hasMrWhite: boolean;
  currentRevealIndex: number;
  votes: Record<string, string>;  // playerId -> votedForPlayerId
  roundNumber: number;
  lastEliminatedIds: string[];
  currentVoterIndex: number;
}
