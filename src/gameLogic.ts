import { getRandomWord } from "./data/kurdishWords";
import type { GameState, Player, Role } from "./types";

export function getImpostorCount(playerCount: number): number {
  if (playerCount <= 4) return 1;
  if (playerCount <= 8) return 2;
  return Math.min(3, Math.floor(playerCount / 3));
}

export function getMaxImpostors(playerCount: number, hasMrWhite: boolean): number {
  return playerCount - 1 - (hasMrWhite ? 1 : 0);
}

export function createInitialState(
  playerCount: number,
  playerNames: string[],
  hasMrWhite: boolean,
  impostorCount: number
): GameState {
  const maxImpostors = getMaxImpostors(playerCount, hasMrWhite);
  const clampedImpostors = Math.max(1, Math.min(impostorCount, maxImpostors));
  const civilianCount = playerCount - clampedImpostors - (hasMrWhite ? 1 : 0);

  // Ensure we have at least 1 civilian
  if (civilianCount < 1) {
    throw new Error("نابێت ژمارەی یاریزانی زیاتر لە ئیمپۆستەر و کەسی بێ وشە بێت");
  }

  const civilWord = getRandomWord();
  const roles = assignRoles(playerCount, clampedImpostors, hasMrWhite);

  const players: Player[] = roles.map((role, i) => ({
    id: `player-${i}`,
    name: playerNames[i] || `یاریزان ${i + 1}`,
    role,
    word: role === "civilian" ? civilWord : null,
    isEliminated: false,
    votesReceived: 0,
  }));

  return {
    phase: "roleReveal",
    playerCount,
    players,
    civilWord,
    hasMrWhite,
    currentRevealIndex: 0,
    votes: {},
    roundNumber: 1,
    lastEliminatedIds: [],
    currentVoterIndex: 0,
  };
}

function assignRoles(
  playerCount: number,
  impostorCount: number,
  hasMrWhite: boolean
): Role[] {
  const roles: Role[] = new Array(playerCount).fill("civilian");
  const indices = [...Array(playerCount).keys()];

  // Shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Assign impostors
  for (let i = 0; i < impostorCount; i++) {
    roles[indices[i]] = "impostor";
  }

  // Assign Mr. White if enabled
  if (hasMrWhite) {
    roles[indices[impostorCount]] = "mrWhite";
  }

  return roles;
}

export function castVote(
  state: GameState,
  voterId: string,
  targetId: string
): GameState {
  const activePlayers = state.players.filter((p) => !p.isEliminated);
  const voter = activePlayers.find((p) => p.id === voterId);
  const target = state.players.find((p) => p.id === targetId);

  if (!voter || !target || target.isEliminated) return state;
  if (state.phase !== "voting") return state;

  return {
    ...state,
    votes: { ...state.votes, [voterId]: targetId },
  };
}

export function submitVotes(state: GameState): GameState {
  const voteCount = Object.keys(state.votes).length;
  const activePlayers = state.players.filter((p) => !p.isEliminated);

  if (voteCount < activePlayers.length) return state;

  // Count votes
  const voteCounts: Record<string, number> = {};
  for (const targetId of Object.values(state.votes)) {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  }

  // Find player(s) with most votes
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const eliminatedIds = Object.entries(voteCounts)
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id);

  const updatedPlayers = state.players.map((p) => ({
    ...p,
    votesReceived: voteCounts[p.id] || 0,
    isEliminated: p.isEliminated || eliminatedIds.includes(p.id),
  }));

  const remainingCivilians = updatedPlayers.filter(
    (p) => !p.isEliminated && p.role === "civilian"
  ).length;
  const remainingImpostors = updatedPlayers.filter(
    (p) => !p.isEliminated && p.role === "impostor"
  ).length;
  const remainingMrWhite = updatedPlayers.filter(
    (p) => !p.isEliminated && p.role === "mrWhite"
  ).length;

  let phase: GameState["phase"] = "roundEnd";
  if (remainingImpostors === 0 && remainingMrWhite === 0) {
    phase = "gameOver"; // Civilians win
  } else if (remainingCivilians <= 1) {
    phase = "gameOver"; // Impostors win
  }

  return {
    ...state,
    phase,
    players: updatedPlayers,
    votes: {},
    roundNumber: phase === "roundEnd" ? state.roundNumber + 1 : state.roundNumber,
    lastEliminatedIds: eliminatedIds,
    currentVoterIndex: 0,
  };
}


export function getWinners(state: GameState): "civilians" | "impostors" | null {
  if (state.phase !== "gameOver") return null;
  const remainingCivilians = state.players.filter(
    (p) => !p.isEliminated && p.role === "civilian"
  ).length;
  const remainingImpostors = state.players.filter(
    (p) => !p.isEliminated && p.role === "impostor"
  ).length;
  if (remainingImpostors === 0) return "civilians";
  if (remainingCivilians <= 1) return "impostors";
  return null;
}
