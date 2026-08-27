import type { GameState } from "../game-state.js";
import type { Command, CommandResult, CommandRejection } from "./types.js";
import { validateMoveUnit, handleMoveUnit } from "./move-unit.js";
import { validateFoundCity, handleFoundCity } from "./found-city.js";
import { handleEndTurn, validateEndTurn } from "./end-turn.js";
import {
  handleBuildImprovement,
  validateBuildImprovement,
} from "./build-improvement.js";
import { handleFortifyUnit, validateFortifyUnit } from "./fortify-unit.js";
import { handleSleepUnit, validateSleepUnit } from "./sleep-unit.js";

const VALID_KINDS = new Set([
  "MoveUnit",
  "BuildImprovement",
  "FortifyUnit",
  "SleepUnit",
  "FoundCity",
  "EndTurn",
]);

export function validate(state: GameState, command: Command): CommandRejection | null {
  if (!VALID_KINDS.has(command.kind)) {
    return { code: "malformed", message: `Unknown command kind: ${command.kind}` };
  }

  if (state.phase !== "playing") {
    return { code: "not_your_turn", message: "Game is not in playing phase" };
  }

  const simultaneous = state.settings.simultaneousTurns;
  if (!simultaneous && command.playerId !== state.activePlayerId) {
    return { code: "not_your_turn", message: "It is not your turn" };
  }

  if (command.kind === "EndTurn") {
    if (simultaneous && (state.submittedEndTurnPlayerIds ?? []).includes(command.playerId)) {
      return { code: "illegal", message: "Player already submitted EndTurn" };
    }
    return validateEndTurn(state, command);
  }

  if (!state.playerOrder.includes(command.playerId)) {
    return {
      code: "unknown_entity",
      message: `Player is not in the turn order: ${command.playerId}`,
    };
  }

  const unit = state.entities.units[command.unitId];
  if (!unit) {
    return { code: "unknown_entity", message: `Unknown unit: ${command.unitId}` };
  }

  if (unit.ownerId !== command.playerId) {
    return { code: "not_owner", message: "Unit belongs to another player" };
  }

  if (command.kind === "MoveUnit") {
    return validateMoveUnit(state, command, unit);
  }

  if (command.kind === "FoundCity") {
    return validateFoundCity(state, command, unit);
  }

  if (command.kind === "BuildImprovement") {
    return validateBuildImprovement(state, command, unit);
  }

  if (command.kind === "FortifyUnit") {
    return validateFortifyUnit(state, command, unit);
  }

  if (command.kind === "SleepUnit") {
    return validateSleepUnit(state, command, unit);
  }

  return null;
}

export function applyCommand(state: GameState, command: Command): CommandResult {
  const rejection = validate(state, command);
  if (rejection) {
    return { ok: false, reason: rejection };
  }

  switch (command.kind) {
    case "MoveUnit":
      return handleMoveUnit(state, command);
    case "FoundCity":
      return handleFoundCity(state, command);
    case "BuildImprovement":
      return handleBuildImprovement(state, command);
    case "FortifyUnit":
      return handleFortifyUnit(state, command);
    case "SleepUnit":
      return handleSleepUnit(state, command);
    case "EndTurn":
      return handleEndTurn(state, command);
  }
}
