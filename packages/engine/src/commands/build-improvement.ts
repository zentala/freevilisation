import type { GameState } from "../game-state.js";
import type { Unit } from "../entities/Unit.js";
import type { Command, CommandRejection, CommandResult } from "./types.js";

/** Validates the shape of a build order. E15 adds worker and build-turn rules. */
export function validateBuildImprovement(
  _state: GameState,
  command: Command & { kind: "BuildImprovement" },
  _unit: Unit,
): CommandRejection | null {
  if (command.improvementDefId.length === 0) {
    return { code: "malformed", message: "Improvement definition must not be empty" };
  }
  return null;
}

/**
 * Applies the command skeleton without claiming completion. Improvement
 * turns, worker eligibility, and tile mutation belong to E15.
 */
export function handleBuildImprovement(
  state: GameState,
  _command: Command & { kind: "BuildImprovement" },
): CommandResult {
  return { ok: true, state, events: [] };
}
