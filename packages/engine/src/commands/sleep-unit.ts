import type { GameState } from "../game-state.js";
import type { Unit } from "../entities/Unit.js";
import type { Command, CommandRejection, CommandResult } from "./types.js";

/** Validates a sleep order. The persisted order state is added with E10-W3. */
export function validateSleepUnit(
  _state: GameState,
  _command: Command & { kind: "SleepUnit" },
  _unit: Unit,
): CommandRejection | null {
  return null;
}

/** Keeps the command surface ready until order persistence is implemented. */
export function handleSleepUnit(
  state: GameState,
  _command: Command & { kind: "SleepUnit" },
): CommandResult {
  return { ok: true, state, events: [] };
}
