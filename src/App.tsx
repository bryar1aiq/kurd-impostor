import { useState, useCallback, useEffect } from "react";
import {
  createInitialState,
  castVote,
  submitVotes,
  getMaxImpostors,
  getWinners,
} from "./gameLogic";
import type { GameState } from "./types";

const KURDISH = {
  title: "ئیمپۆستەری وشە",
  subtitle: "یاری فێربوونی کوردی سۆرانی",
  selectPlayers: "ژمارەی یاریزانەکان",
  selectImpostors: "ژمارەی ئیمپۆستەر",
  players: (n: number) => `${n} یاریزان`,
  impostors: (n: number) => `${n} ئیمپۆستەر`,
  mrWhite: "کەسی بێ وشە",
  mrWhiteDesc: "کەسێک وشە نازانێت و دەیگرێت لە قسەکانی تر",
  startGame: "دەستپێکردن",
  yourRole: "ڕۆڵی تۆ",
  civilian: "یاریزانی ئاسایی",
  impostor: "ئیمپۆستەر",
  mrWhiteRole: "کەسی بێ وشە",
  yourWord: "وشەی تۆ",
  noWord: "تۆ وشەت نییە! بڕوا بە قسەکانی تر بکە و بیزانە چیە.",
  nextPlayer: "یاریزانی دواتر",
  hideWord: "وشەکە بشارەوە",
  mustHideFirst: "پێش ئەوەی بڕۆیت، دەبێ وشەکە بشاریتەوە",
  passTo: (name: string) => `ئامێزەک بگەیەنە ${name}`,
  ready: "ئامادەم",
  beginDiscussion: "دەستپێ بکەن",
  discussionPhase: "کاتی وتوێژ",
  discussHint: "وتوێژ بکەن و هەوڵ بدەن ئیمپۆستەر بدۆزنەوە",
  votePhase: "دەنگدان",
  voteForImpostor: "بۆ کێ دەدەیت دەنگ؟",
  eliminated: "دەرکرا",
  wasRole: (role: string) => `ڕۆڵ: ${role}`,
  civiliansWin: "یاریزانانی ئاسایی براوەن!",
  impostorsWin: "ئیمپۆستەرەکان براوەن!",
  playAgain: "یاری دووبارە",
  round: (n: number) => `گێم ${n}`,
  secretWord: "وشەی نهێنی",
  civilWord: "وشەی یاریزانان",
  guessIt: "هەڵیبێنە",
  guessItDesc: "وشەت نییە، دەبێ لە قسەکانی تر بیزانیت",
  playerNames: "ناوی یاریزانەکان",
  playerNamesOptional: "ئارەزوومەندانە - بەتاڵ بهێڵە بۆ یاریزان ١، ٢، ٣...",
};

const GAME_PHASES = ["roleReveal", "discussion", "voting", "roundEnd"] as const;
const DISCUSSION_SECONDS = 60;

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerCount, setPlayerCount] = useState(5);
  const [impostorCount, setImpostorCount] = useState(1);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [hasMrWhite, setHasMrWhite] = useState(false);
  const [discussionSeconds, setDiscussionSeconds] = useState(DISCUSSION_SECONDS);
  const [discussionRunning, setDiscussionRunning] = useState(false);
  const [wordHidden, setWordHidden] = useState(false);

  const startNewGame = useCallback(() => {
    const names = Array.from({ length: playerCount }, (_, i) =>
      (playerNames[i]?.trim() || "").length > 0 ? playerNames[i].trim() : `یاریزان ${i + 1}`
    );
    try {
      const state = createInitialState(playerCount, names, hasMrWhite, impostorCount);
      setGameState(state);
      setDiscussionSeconds(DISCUSSION_SECONDS);
      setDiscussionRunning(false);
      setWordHidden(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "هەڵەیەک ڕوویدا");
    }
  }, [playerCount, playerNames, hasMrWhite, impostorCount]);

  const resetToSetup = useCallback(() => {
    setGameState(null);
    setDiscussionSeconds(DISCUSSION_SECONDS);
  }, []);

  const phaseKey =
    gameState?.phase === "gameOver" ? "roundEnd" : gameState?.phase ?? "roleReveal";
  const phaseIndex = gameState
    ? GAME_PHASES.indexOf(phaseKey as (typeof GAME_PHASES)[number])
    : -1;

  const maxImpostors = getMaxImpostors(playerCount, hasMrWhite);

  useEffect(() => {
    setImpostorCount((c) => Math.max(1, Math.min(c, maxImpostors)));
  }, [playerCount, hasMrWhite, maxImpostors]);

  useEffect(() => {
    if (!discussionRunning || gameState?.phase !== "discussion") return;
    const id = setInterval(() => {
      setDiscussionSeconds((s) => {
        if (s <= 1) {
          setDiscussionRunning(false);
          setGameState((g) => g ? { ...g, phase: "voting" } : null);
          return DISCUSSION_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [discussionRunning, gameState?.phase]);

  const state = gameState;
  const currentPlayer = state?.players[state.currentRevealIndex];
  const activePlayers = state ? state.players.filter((p) => !p.isEliminated) : [];
  const currentVoter = activePlayers[state?.currentVoterIndex ?? 0];
  const currentVote = currentVoter ? state?.votes[currentVoter.id] : undefined;
  const winners = state ? getWinners(state) : null;

  return (
    <div className="min-h-screen flex flex-col font-kurdish bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/30 via-surface to-surface" dir="rtl">
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-sm border-b border-amber-500/10 pt-5 pb-4 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl" role="img" aria-hidden>🎮</span>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-primary to-amber-600 bg-clip-text text-transparent drop-shadow-sm">
            {KURDISH.title}
          </h1>
        </div>
        <p className="text-amber-200/70 text-sm mt-1 font-normal">{KURDISH.subtitle}</p>
        {state && (
          <div className="flex gap-2 justify-center mt-4">
            {["ڕۆڵ", "وتوێژ", "دەنگ", "ئەنجام"].map((label, i) => (
              <span
                key={label}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ease-out ${
                  phaseIndex > i
                    ? "bg-amber-400 scale-110 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                    : phaseIndex === i
                      ? "bg-amber-400 scale-125 ring-2 ring-amber-400/50 ring-offset-2 ring-offset-surface shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                      : "bg-surface-elevated"
                }`}
                title={label}
              />
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col gap-0">
        {/* Setup */}
        <section
          className={`transition-all duration-300 ease-out ${
            !state ? "block animate-fade-up" : "hidden"
          }`}
        >
          <div className="bg-surface-card/90 backdrop-blur border-2 border-amber-500/20 rounded-3xl p-6 shadow-2xl shadow-amber-500/5">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl" role="img" aria-hidden>👥</span>
              <h2 className="text-xl font-bold text-slate-100">
                {KURDISH.selectPlayers}
              </h2>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-6">
              {Array.from({ length: 18 }, (_, i) => {
                const num = i + 3;
                const isSelected = playerCount === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPlayerCount(num)}
                    className={`aspect-square flex items-center justify-center rounded-xl font-bold text-lg transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/40 ring-2 ring-amber-400/60 scale-105"
                        : "bg-surface-elevated/80 hover:bg-surface-elevated text-slate-300 hover:text-amber-300 border border-white/5 hover:border-amber-500/30"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-amber-400 font-semibold mb-6">
              {KURDISH.players(playerCount)}
            </p>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl" role="img" aria-hidden>🕵️</span>
              <h2 className="text-xl font-bold text-slate-100">
                {KURDISH.selectImpostors}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: maxImpostors }, (_, i) => {
                const num = i + 1;
                const isSelected = impostorCount === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setImpostorCount(num)}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl font-bold text-base transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? "bg-gradient-to-br from-red-500/80 to-red-600/80 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-400/60 scale-105"
                        : "bg-surface-elevated/80 hover:bg-surface-elevated text-slate-300 hover:text-red-300 border border-white/5 hover:border-red-500/30"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-red-300/90 font-semibold mb-6">
              {KURDISH.impostors(impostorCount)}
            </p>

            <div className="bg-surface-elevated/50 rounded-2xl p-4 mb-6 border border-white/5">
              <label className="flex items-start gap-4 cursor-pointer group">
                <input type="checkbox" checked={hasMrWhite} onChange={(e) => setHasMrWhite(e.target.checked)} className="sr-only peer" />
                <span className="w-12 h-7 bg-surface/80 rounded-full shrink-0 relative transition-all duration-200 peer-checked:bg-amber-500/30 border border-white/10 peer-checked:border-amber-500/40 after:content-[''] after:absolute after:w-5 after:h-5 after:bg-slate-400 after:rounded-full after:top-1 after:right-1 after:transition-all after:duration-200 peer-checked:after:bg-amber-400 peer-checked:after:right-6 group-hover:border-amber-500/30" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[0.95rem] font-semibold text-slate-200 group-hover:text-amber-200/90">
                    {KURDISH.mrWhite}
                  </span>
                  <small className="font-normal text-sm text-slate-400">{KURDISH.mrWhiteDesc}</small>
                </span>
              </label>
            </div>

            <div className="space-y-2 mb-6">
              <p className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span role="img" aria-hidden>📝</span>
                {KURDISH.playerNames}
              </p>
              <p className="text-xs text-slate-500 mb-3">{KURDISH.playerNamesOptional}</p>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: playerCount }, (_, i) => (
                  <div key={i} className="relative">
                    <span className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-500 text-sm font-medium pointer-events-none">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      placeholder={`یاریزان ${i + 1}`}
                      value={playerNames[i] ?? ""}
                      onChange={(e) => {
                        const next = [...playerNames];
                        next[i] = e.target.value;
                        setPlayerNames(next);
                      }}
                      className="w-full pr-10 pl-4 py-3 rounded-xl border-2 border-white/10 bg-surface-input/80 text-slate-100 font-inherit text-[0.95rem] text-right placeholder:text-slate-500/70 transition-all duration-200 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 focus:bg-surface-input hover:border-white/15"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 text-lg font-bold font-inherit rounded-2xl border-none cursor-pointer transition-all duration-200 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-900 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.98]"
              onClick={startNewGame}
            >
              <span className="text-2xl" role="img" aria-hidden>▶️</span>
              {KURDISH.startGame}
            </button>
          </div>
        </section>

        {/* Role reveal */}
        <section
          className={`transition-all duration-300 ease-out ${
            state?.phase === "roleReveal" ? "block animate-fade-up" : "hidden"
          }`}
        >
          <div className="bg-surface-card/90 backdrop-blur border-2 border-amber-500/20 rounded-3xl p-8 shadow-2xl shadow-amber-500/5 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/15 px-4 py-1.5 rounded-full mb-6 border border-amber-500/20">
              <span role="img" aria-hidden>🏷️</span>
              {KURDISH.round(state?.roundNumber ?? 1)}
            </span>
            <h2 className="text-2xl font-bold mb-3 text-slate-100">{currentPlayer?.name}</h2>
            <p
              className={`inline-flex items-center gap-2 text-lg font-bold py-3 px-6 rounded-2xl my-2 mb-6 border-2 ${
                currentPlayer?.role === "civilian"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : currentPlayer?.role === "impostor"
                    ? "bg-red-500/20 text-red-400 border-red-500/40"
                    : "bg-white/10 text-slate-100 border-white/20"
              }`}
            >
              {currentPlayer?.role === "civilian" && <span role="img" aria-hidden>✅</span>}
              {currentPlayer?.role === "impostor" && <span role="img" aria-hidden>🎭</span>}
              {currentPlayer?.role === "mrWhite" && <span role="img" aria-hidden>❓</span>}
              {currentPlayer?.role === "civilian" && KURDISH.civilian}
              {currentPlayer?.role === "impostor" && KURDISH.impostor}
              {currentPlayer?.role === "mrWhite" && KURDISH.mrWhiteRole}
            </p>
            {wordHidden ? (
              <div className="my-6 p-6 bg-surface-elevated/50 rounded-2xl border-2 border-dashed border-white/10">
                <p className="text-slate-400 text-lg mb-2">
                  {state && state.currentRevealIndex < state.players.length - 1
                    ? KURDISH.passTo(state.players[state.currentRevealIndex + 1]?.name ?? "")
                    : "ئامێزەک بگەیەنە هەموو کەس"}
                </p>
                <p className="text-slate-500 text-sm">وشەکە شاردراوە</p>
              </div>
            ) : currentPlayer?.word ? (
              <div className="my-6 p-6 bg-gradient-to-br from-amber-500/10 to-transparent rounded-2xl border-2 border-dashed border-amber-500/30">
                <span className="block text-sm text-amber-300/80 mb-2">{KURDISH.yourWord}</span>
                <p className="text-4xl font-extrabold text-amber-400 tracking-wide leading-tight m-0 drop-shadow-sm">
                  {currentPlayer.word.word}
                </p>
              </div>
            ) : currentPlayer?.role === "impostor" ? (
              <div className="my-6 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                <p className="text-red-400 font-semibold">تۆ ئیمپۆستەری، وشەت نییە</p>
              </div>
            ) : currentPlayer?.role === "mrWhite" ? (
              <div className="my-6 p-6 bg-amber-500/10 rounded-2xl border-2 border-dashed border-amber-500/30">
                <p className="text-2xl font-bold text-amber-400 mb-2">{KURDISH.guessIt}</p>
                <p className="text-slate-400 text-[0.95rem] leading-relaxed">{KURDISH.guessItDesc}</p>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 mt-4">
              {currentPlayer && !wordHidden && (
                <button
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 text-base font-semibold rounded-xl border-2 border-white/20 bg-surface-elevated/80 text-slate-200 hover:bg-surface-elevated hover:border-white/30 transition-all"
                  onClick={() => setWordHidden(true)}
                >
                  🙈 {KURDISH.hideWord}
                </button>
              )}
              {(() => {
                const mustHideFirst = !!(currentPlayer && !wordHidden);
                return (
                  <button
                    className={`w-full inline-flex items-center justify-center gap-2 py-4 px-6 text-lg font-bold rounded-2xl border-none cursor-pointer transition-all duration-200 ${
                      mustHideFirst
                        ? "bg-slate-600/60 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.98]"
                    }`}
                    onClick={() => {
                      if (!state || mustHideFirst) return;
                      if (state.currentRevealIndex < state.players.length - 1) {
                        setGameState({ ...state, currentRevealIndex: state.currentRevealIndex + 1 });
                        setWordHidden(false);
                      } else {
                        setGameState({ ...state, phase: "discussion" });
                      }
                    }}
                    disabled={mustHideFirst}
                    title={mustHideFirst ? KURDISH.mustHideFirst : undefined}
                  >
                    <span role="img" aria-hidden>
                      {state && state.currentRevealIndex < state.players.length - 1 ? "👉" : "💬"}
                    </span>
                    {mustHideFirst
                      ? KURDISH.mustHideFirst
                      : state && state.currentRevealIndex < state.players.length - 1
                        ? wordHidden
                          ? KURDISH.ready
                          : KURDISH.nextPlayer
                        : KURDISH.beginDiscussion}
                  </button>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Discussion */}
        <section
          className={`transition-all duration-300 ease-out ${
            state?.phase === "discussion" ? "block animate-fade-up" : "hidden"
          }`}
        >
          <div className="bg-surface-card/90 backdrop-blur border-2 border-amber-500/20 rounded-3xl p-6 shadow-2xl shadow-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl" role="img" aria-hidden>💬</span>
              <h2 className="text-xl font-bold text-slate-100">{KURDISH.discussionPhase}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-6">{KURDISH.discussHint}</p>
            <div className="flex flex-col gap-5 items-center">
              <div className="flex flex-col items-center py-6 px-10 bg-gradient-to-br from-amber-500/15 to-transparent rounded-2xl border-2 border-amber-500/20 min-w-[120px]">
                <span className="text-5xl font-black text-amber-400 leading-none tabular-nums">
                  {discussionSeconds}
                </span>
                <span className="text-xs text-amber-300/70 mt-2 font-medium">چرکە</span>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  className="flex-1 py-3.5 px-4 rounded-xl border-2 border-white/10 bg-surface-elevated/50 text-slate-400 hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/10 font-semibold transition-all"
                  onClick={() => setDiscussionRunning(!discussionRunning)}
                >
                  {discussionRunning ? "⏸️ وەستێنە" : "▶️ دەستپێ بکە"}
                </button>
                <button
                  className="flex-[1.5] py-3.5 px-4 rounded-xl border-none font-bold transition-all bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/30 active:scale-[0.98]"
                  onClick={() => state && setGameState({ ...state, phase: "voting" })}
                >
                  🗳️ دەنگدان
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Voting */}
        <section
          className={`transition-all duration-300 ease-out ${
            state?.phase === "voting" ? "block animate-fade-up" : "hidden"
          }`}
        >
          <div className="bg-surface-card/90 backdrop-blur border-2 border-amber-500/20 rounded-3xl p-6 shadow-2xl shadow-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl" role="img" aria-hidden>🗳️</span>
              <h2 className="text-lg font-bold text-slate-100">
                {currentVoter?.name}، {KURDISH.voteForImpostor}
              </h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit mb-4 text-sm text-amber-200/90">
              دەنگ {Object.keys(state?.votes ?? {}).length} لە {activePlayers.length}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {activePlayers
                .filter((p) => p.id !== currentVoter?.id)
                .map((p) => (
                  <button
                    key={p.id}
                    className={`p-4 text-base font-semibold rounded-xl border-2 text-right cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                      currentVote === p.id
                        ? "border-amber-400 bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/20"
                        : "border-white/10 bg-surface-input/80 text-slate-100 hover:border-amber-500/40 hover:bg-amber-500/10"
                    }`}
                    onClick={() => {
                      if (!state || !currentVoter) return;
                      const next = castVote(state, currentVoter.id, p.id);
                      const nextIdx = state.currentVoterIndex + 1;
                      if (nextIdx >= activePlayers.length) {
                        setGameState(submitVotes(next));
                      } else {
                        setGameState({ ...next, currentVoterIndex: nextIdx });
                      }
                    }}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        </section>

        {/* Round end */}
        <section
          className={`transition-all duration-300 ease-out ${
            state?.phase === "roundEnd" ? "block animate-fade-up" : "hidden"
          }`}
        >
          <div className="bg-surface-card/90 backdrop-blur border-2 border-amber-500/20 rounded-3xl p-6 shadow-2xl shadow-amber-500/5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl" role="img" aria-hidden>💀</span>
              <h2 className="text-xl font-bold text-slate-100">{KURDISH.eliminated}</h2>
            </div>
            {state?.lastEliminatedIds.map((id) => {
              const p = state.players.find((x) => x.id === id)!;
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-1 py-4 px-4 bg-red-500/5 border border-red-500/20 rounded-xl mb-3"
                >
                  <strong className="text-[1.05rem] text-slate-100">{p.name}</strong>
                  <span className="text-slate-400 text-sm">
                    {KURDISH.wasRole(
                      p.role === "civilian"
                        ? KURDISH.civilian
                        : p.role === "impostor"
                          ? KURDISH.impostor
                          : KURDISH.mrWhiteRole
                    )}
                  </span>
                  {p.word && (
                    <span className="text-amber-400 text-[0.95rem] font-medium">{p.word.word}</span>
                  )}
                </div>
              );
            })}
            <div className="flex flex-col gap-2 my-6 py-4 px-4 bg-surface-elevated/50 rounded-xl border border-white/5 text-sm text-slate-400">
              <span>
                {KURDISH.civilWord}: <strong className="text-emerald-400">{state?.civilWord.word}</strong>
              </span>
            </div>
            <button
              className="w-full py-4 px-6 text-lg font-bold rounded-2xl border-none cursor-pointer transition-all bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.98]"
              onClick={() => state && setGameState({ ...state, phase: "discussion" })}
            >
              گێمی دواتر ➡️
            </button>
          </div>
        </section>

        {/* Game over */}
        <section
          className={`transition-all duration-300 ease-out ${
            state?.phase === "gameOver" ? "block animate-fade-up" : "hidden"
          }`}
        >
          <div className="bg-surface-card/90 backdrop-blur border-2 border-amber-500/20 rounded-3xl p-8 shadow-2xl shadow-amber-500/5 text-center">
            <div className="text-6xl mb-4">
              {winners === "civilians" ? "🏆" : "🎭"}
            </div>
            <h2
              className={`text-2xl md:text-3xl font-black mb-6 ${
                winners === "civilians"
                  ? "text-emerald-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.3)]"
                  : "text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.3)]"
              }`}
            >
              {winners === "civilians" ? KURDISH.civiliansWin : KURDISH.impostorsWin}
            </h2>
            <div className="flex flex-col gap-2 my-6 py-4 px-4 bg-surface-elevated/50 rounded-xl border border-white/5 text-sm text-slate-400">
              <span>
                {KURDISH.civilWord}: <strong className="text-emerald-400">{state?.civilWord.word}</strong>
              </span>
            </div>
            <button
              className="w-full py-4 px-6 text-lg font-bold rounded-2xl border-none cursor-pointer transition-all bg-gradient-to-r from-amber-400 to-amber-600 text-slate-900 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.98]"
              onClick={resetToSetup}
            >
              🔄 {KURDISH.playAgain}
            </button>
          </div>
        </section>
      </main>

      {state && (
        <footer className="pt-6 pb-2 text-center">
          <button
            className="px-4 py-2 rounded-full bg-surface-elevated/80 border border-amber-500/20 text-slate-400 text-sm font-medium hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
            onClick={resetToSetup}
          >
            یاری نوێ
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;
