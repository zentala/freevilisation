import type { GameState } from "../game-state.js";
import type { Command } from "../commands/types.js";
import type { PlayerId } from "../ids.js";

/** Returns the SaveGame command when the completed turn reaches the interval. */
export function autosaveCommand(state: GameState, playerId: PlayerId): Command | null {
  const interval = state.settings.autosaveInterval;
  if (interval === null || interval === undefined || interval <= 0) return null;
  if (state.turn === 0 || state.turn % interval !== 0) return null;
  return { kind: "SaveGame", playerId, label: `autosave-turn-${state.turn}` };
}
