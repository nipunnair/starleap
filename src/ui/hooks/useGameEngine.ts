import { useCallback, useMemo, useReducer } from 'react';
import { createInitialState, type GameState, type PlayerCount } from '../../engine/state';
import { generateLegalMoves, type Move } from '../../engine/moves';
import { applyMove as engineApplyMove } from '../../engine/apply';
import { isGameOver } from '../../engine/terminal';

interface EngineState {
  readonly game: GameState;
  readonly selectedPegId: string | null;
}

type Action =
  | { type: 'SELECT'; pegId: string }
  | { type: 'DESELECT' }
  | { type: 'APPLY_MOVE'; move: Move };

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedPegId: action.pegId };
    case 'DESELECT':
      return { ...state, selectedPegId: null };
    case 'APPLY_MOVE':
      return { game: engineApplyMove(state.game, action.move), selectedPegId: null };
    default:
      return state;
  }
}

export function useGameEngine(playerCount: PlayerCount) {
  const [state, dispatch] = useReducer(reducer, playerCount, (pc) => ({
    game: createInitialState(pc),
    selectedPegId: null,
  }));

  const select = useCallback((pegId: string) => dispatch({ type: 'SELECT', pegId }), []);
  const deselect = useCallback(() => dispatch({ type: 'DESELECT' }), []);
  const applyMove = useCallback((move: Move) => dispatch({ type: 'APPLY_MOVE', move }), []);

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
    select,
    deselect,
    applyMove,
  };
}

export type UseGameEngine = ReturnType<typeof useGameEngine>;
