import type { GameState } from "../game-state.js";
import type { Unit } from "../entities/Unit.js";
import type { Command, CommandRejection, CommandResult } from "./types.js";

/** Validates a fortify order. Combat bonus accrual is handled by E14. */
export function validateFortifyUnit(
  _state: GameState,
  _command: Command & { kind: "FortifyUnit" },
  _unit: Unit,
): CommandRejection | null {
  return null;
}

/** Keeps the command surface ready until turn-based fortification is added. */
export function handleFortifyUnit(
  state: GameState,
  _command: Command & { kind: "FortifyUnit" },
): CommandResult {
  return { ok: true, state, events: [] };
}
