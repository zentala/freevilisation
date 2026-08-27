import type { GameState } from "../game-state.js";
import type { GameEvent } from "../commands/types.js";
import type { DefId, PlayerId } from "../ids.js";

export interface VictoryResult {
  readonly winnerPlayerId: PlayerId;
  readonly victoryType: DefId<"victory">;
}

export type VictoryChecker = (state: GameState) => VictoryResult | null;

export interface VictoryResolution {
  readonly state: GameState;
  readonly events: GameEvent[];
}

/** Applies a victory result at the turn boundary, if the checker found one. */
export function resolveVictory(state: GameState, checkVictory: VictoryChecker): VictoryResolution {
  const victory = checkVictory(state);
  if (!victory) return { state, events: [] };
  return {
    state: {
      ...state,
      phase: "game_over",
      winnerPlayerId: victory.winnerPlayerId,
      victoryType: victory.victoryType,
    },
    events: [{ kind: "GameOver", ...victory }],
  };
}
