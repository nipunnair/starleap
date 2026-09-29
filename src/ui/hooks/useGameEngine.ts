import { useCallback, useMemo, useReducer } from 'react';
import { createInitialState, type GameState, type PlayerCount } from '../../engine/state';
import { generateLegalMoves, type Move } from '../../engine/moves';
import { applyMove as engineApplyMove, skipFinishedPlayers } from '../../engine/apply';
import { commitSessionMove, undoSessionMove, type SessionStats } from '../../progression/sessionStats';
import { isGameOver } from '../../engine/terminal';

export interface GameSnapshot {
  readonly stats?: SessionStats;
  readonly game: GameState;
  readonly previousGame: GameState | null;
  readonly canUndo: boolean;
}

interface EngineState extends GameSnapshot {
  readonly game: GameState;
  readonly selectedPegId: string | null;
  readonly previousGame: GameState | null;
  /** True only when the last applied move was the human's own and hasn't been undone or
   * followed by another move yet — SPEC.md P7.6: "undo human moves only," single level. */
  readonly canUndo: boolean;
}

type Action =
  | { type: 'SELECT'; pegId: string }
  | { type: 'DESELECT' }
  | { type: 'APPLY_MOVE'; move: Move; isHuman: boolean; sequence?: number }
  | { type: 'UNDO' }
  | { type: 'LOAD_STATE'; game: GameState };

export function gameReducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedPegId: action.pegId };
    case 'DESELECT':
      return { ...state, selectedPegId: null };
    case 'APPLY_MOVE': {
      if (state.stats && action.sequence !== state.stats.lastEventSequence + 1) return state;
      const game = skipFinishedPlayers(engineApplyMove(state.game, action.move));
      const stats = state.stats ? commitSessionMove(state.stats, {
        sessionId: state.stats.context.sessionId, sequence: action.sequence!,
        before: state.game, after: game, move: action.move,
      }) : undefined;
      return {
        stats,
        // skipFinishedPlayers only ever changes currentPlayer/round, never peg positions, so
        // undo (which restores `previousGame`, captured below as the pre-move *and* pre-skip
        // state) still lands exactly back on the mover's own turn, not a skipped-past one.
        game,
        selectedPegId: null,
        previousGame: state.game,
        canUndo: action.isHuman,
      };
    }
    case 'UNDO':
      if (!state.canUndo || !state.previousGame) return state;
      return { stats: state.stats ? undoSessionMove(state.stats) : undefined, game: state.previousGame, selectedPegId: null, previousGame: null, canUndo: false };
    case 'LOAD_STATE':
      // Defensive: a resumed/loaded save could in principle land on a since-finished player's
      // turn (e.g. an older save predating this rule). Cheap no-op otherwise.
      return { game: skipFinishedPlayers(action.game), selectedPegId: null, previousGame: null, canUndo: false };
    default:
      return state;
  }
}

export function useGameEngine(
  playerCount: PlayerCount,
  initialGameState?: GameState,
  cordonNeutralCorners: boolean = true,
  initialSnapshot?: GameSnapshot,
) {
  const [state, dispatch] = useReducer(gameReducer, playerCount, (pc) => ({
    // A freshly created game never starts on a finished player, but a resumed save or a
    // hand-built scenario (Tutorial, debug fixtures) bypasses the reducer entirely here, so it
    // needs the same defensive skipFinishedPlayers the LOAD_STATE case gets.
    game: skipFinishedPlayers(initialGameState ?? createInitialState(pc, { cordonNeutralCorners })),
    selectedPegId: null,
    previousGame: initialSnapshot?.previousGame ?? null,
    canUndo: initialSnapshot?.canUndo ?? false,
    stats: initialSnapshot?.stats,
  }));

  const select = useCallback((pegId: string) => dispatch({ type: 'SELECT', pegId }), []);
  const deselect = useCallback(() => dispatch({ type: 'DESELECT' }), []);
  const applyMove = useCallback(
    (move: Move, isHuman: boolean, sequence?: number) => dispatch({ type: 'APPLY_MOVE', move, isHuman, sequence }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const loadState = useCallback((game: GameState) => dispatch({ type: 'LOAD_STATE', game }), []);

  const legalMoves = useMemo(() => {
    if (!state.selectedPegId) return [];
    const all = generateLegalMoves(state.game, state.game.currentPlayer);
    return all.filter((m) => m.pegId === state.selectedPegId);
  }, [state.game, state.selectedPegId]);

  const gameOver = useMemo(() => isGameOver(state.game), [state.game]);

  const snapshot = useMemo<GameSnapshot>(() => ({
    game: state.game, stats: state.stats, previousGame: state.previousGame, canUndo: state.canUndo,
  }), [state.game, state.stats, state.previousGame, state.canUndo]);

  return {
    snapshot,
    game: state.game,
    selectedPegId: state.selectedPegId,
    legalMoves,
    gameOver,
    canUndo: state.canUndo,
    select,
    deselect,
    applyMove,
    undo,
    loadState,
  };
}
