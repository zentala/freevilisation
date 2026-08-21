import type { GameState } from "../game-state.js";
import type { Command, CommandResult, CommandRejection } from "./types.js";
import { validateMoveUnit, handleMoveUnit } from "./move-unit.js";
import { validateFoundCity, handleFoundCity } from "./found-city.js";
import { handleEndTurn } from "./end-turn.js";

const VALID_KINDS = new Set(["MoveUnit", "FoundCity", "EndTurn"]);

export function validate(state: GameState, command: Command): CommandRejection | null {
  if (!VALID_KINDS.has(command.kind)) {
    return { code: "malformed", message: `Unknown command kind: ${command.kind}` };
  }

  if (state.phase !== "playing") {
    return { code: "not_your_turn", message: "Game is not in playing phase" };
  }

  if (command.playerId !== state.activePlayerId) {
    return { code: "not_your_turn", message: "It is not your turn" };
  }

  if (!state.playerOrder.includes(command.playerId)) {
    return {
      code: "unknown_entity",
      message: `Player is not in the turn order: ${command.playerId}`,
    };
  }

  if (command.kind === "EndTurn") {
    return null;
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
    case "EndTurn":
      return handleEndTurn(state, command);
  }
}
