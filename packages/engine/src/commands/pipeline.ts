import type { GameState } from "../game-state.js";
import type { Command, CommandResult, CommandRejection, GameEvent } from "./types.js";
import type { CityId } from "../ids.js";
import { Unit } from "../entities/Unit.js";
import { City } from "../entities/City.js";
import { makeEntityId } from "../ids.js";

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
    if (command.path.length === 0) {
      return { code: "malformed", message: "Path must not be empty" };
    }
    for (const hex of command.path) {
      if (!state.map.tiles[hex]) {
        return { code: "illegal", message: `Unknown tile: ${hex}` };
      }
    }
    if (command.path.length > unit.movesLeft) {
      return { code: "illegal", message: "Not enough moves" };
    }
  }

  if (command.kind === "FoundCity") {
    if (!command.name || command.name.length === 0) {
      return { code: "malformed", message: "City name must not be empty" };
    }
    const unitCoord = unit.coord;
    for (const city of Object.values(state.entities.cities)) {
      if (city.centerTile === unitCoord) {
        return { code: "illegal", message: "A city already exists at this location" };
      }
    }
  }

  return null;
}

function handleMoveUnit(state: GameState, command: Command & { kind: "MoveUnit" }): CommandResult {
  const unit = state.entities.units[command.unitId]!;
  const prevCoord = unit.coord;
  const newMovesLeft = unit.movesLeft - command.path.length;
  const to = command.path[command.path.length - 1]!;

  const movedUnit = new Unit(
    unit.id, unit.createdTurn, unit.defId, unit.ownerId,
    to, unit.hp, newMovesLeft, unit.movesMax,
    unit.promotions, unit.experience, unit.fortifiedTurns, unit.isEmbarked,
  );

  const nextUnits = { ...state.entities.units, [command.unitId]: movedUnit };
  const events: GameEvent[] = [
    { kind: "UnitMoved", unitId: command.unitId, from: prevCoord, to, movesRemaining: newMovesLeft },
  ];

  return {
    ok: true,
    state: { ...state, entities: { ...state.entities, units: nextUnits } },
    events,
  };
}

function handleFoundCity(state: GameState, command: Command & { kind: "FoundCity" }): CommandResult {
  const unit = state.entities.units[command.unitId]!;
  const cityId = makeEntityId(state.nextEntitySeq) as CityId;
  const isFirstCity = !Object.values(state.entities.cities).some(
    (c) => c.ownerId === command.playerId,
  );

  const city = new City(
    cityId, state.turn, command.playerId, state.turn,
    unit.coord, command.name, 1, 0, 0,
    [], [], [], [], 0, 0, isFirstCity,
  );

  const { [command.unitId]: _removed, ...remainingUnits } = state.entities.units;
  const nextCities = { ...state.entities.cities, [cityId]: city };
  const events: GameEvent[] = [
    { kind: "CityFounded", cityId, playerId: command.playerId, coord: unit.coord },
  ];

  return {
    ok: true,
    state: {
      ...state,
      nextEntitySeq: state.nextEntitySeq + 1,
      entities: { units: remainingUnits, cities: nextCities },
    },
    events,
  };
}

function handleEndTurn(state: GameState, command: Command & { kind: "EndTurn" }): CommandResult {
  const currentIndex = state.playerOrder.indexOf(command.playerId);
  const nextIndex = (currentIndex + 1) % state.playerOrder.length;
  const wrap = nextIndex === 0;
  const nextTurn = wrap ? state.turn + 1 : state.turn;
  const nextActivePlayerId = state.playerOrder[nextIndex] ?? null;

  const events: GameEvent[] = [
    { kind: "TurnEnded", turn: state.turn, activePlayerId: command.playerId },
    { kind: "TurnStarted", turn: nextTurn, activePlayerId: nextActivePlayerId },
  ];

  return {
    ok: true,
    state: { ...state, turn: nextTurn, activePlayerId: nextActivePlayerId },
    events,
  };
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
