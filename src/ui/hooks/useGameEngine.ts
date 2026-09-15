import { useCallback, useMemo, useReducer } from 'react';
import { createInitialState, type GameState, type PlayerCount } from '../../engine/state';
import { generateLegalMoves, type Move } from '../../engine/moves';
import { applyMove as engineApplyMove } from '../../engine/apply';
import { isGameOver } from '../../engine/terminal';

interface EngineState {
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
  | { type: 'APPLY_MOVE'; move: Move; isHuman: boolean }
  | { type: 'UNDO' }
  | { type: 'LOAD_STATE'; game: GameState };

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedPegId: action.pegId };
    case 'DESELECT':
      return { ...state, selectedPegId: null };
    case 'APPLY_MOVE':
      return {
        game: engineApplyMove(state.game, action.move),
        selectedPegId: null,
        previousGame: state.game,
        canUndo: action.isHuman,
      };
    case 'UNDO':
      if (!state.canUndo || !state.previousGame) return state;
      return { game: state.previousGame, selectedPegId: null, previousGame: null, canUndo: false };
    case 'LOAD_STATE':
      return { game: action.game, selectedPegId: null, previousGame: null, canUndo: false };
    default:
      return state;
  }
}

export function useGameEngine(playerCount: PlayerCount, initialGameState?: GameState) {
  const [state, dispatch] = useReducer(reducer, playerCount, (pc) => ({
    game: initialGameState ?? createInitialState(pc),
    selectedPegId: null,
    previousGame: null,
    canUndo: false,
  }));

  const select = useCallback((pegId: string) => dispatch({ type: 'SELECT', pegId }), []);
  const deselect = useCallback(() => dispatch({ type: 'DESELECT' }), []);
  const applyMove = useCallback(
    (move: Move, isHuman: boolean) => dispatch({ type: 'APPLY_MOVE', move, isHuman }),
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

  return {
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
