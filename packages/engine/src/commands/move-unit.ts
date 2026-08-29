import type { GameState } from "../game-state.js";
import type { Command, CommandResult, CommandRejection, GameEvent } from "./types.js";
import type { HexKey, UnitId } from "../ids.js";
import type { Unit } from "../entities/Unit.js";
import { Unit as UnitClass } from "../entities/Unit.js";
import { fromHexKey, toHexKey } from "../hex/coords.js";
import { neighbors, type WrapContext } from "../hex/hex-math.js";
import { toWrapContext } from "../hex/game-map.js";
import { stepCost } from "../movement/step.js";
import { Tile } from "../entities/Tile.js";
import { updatePlayerVisibilityWithEvents } from "../visibility.js";

function withOccupants(tile: Tile, occupantUnitIds: UnitId[]): Tile {
  return new Tile(
    tile.id,
    tile.createdTurn,
    tile.hexKey,
    tile.terrainDefId,
    tile.featureDefId,
    tile.resourceDefId,
    tile.improvementDefId,
    tile.riverEdge0,
    tile.riverEdge1,
    tile.riverEdge2,
    tile.ownerCity,
    tile.ownerPlayer,
    tile.workedByCity,
    occupantUnitIds,
  );
}

function isWater(tile: Tile): boolean {
  const terrain = (tile.terrainDefId as string).replace(/^terrain_/, "").toLowerCase();
  return terrain === "coast" || terrain === "ocean" || terrain === "lake";
}

/** Returns true if `to` is one of the six hex neighbours of `from`. */
function isAdjacent(from: HexKey, to: HexKey, wrap: WrapContext): boolean {
  const fromCoord = fromHexKey(from);
  return neighbors(fromCoord, wrap).some((candidate) => toHexKey(candidate) === to);
}

/**
 * Rejects a `MoveUnit` path that is not a chain of hex-adjacent steps
 * starting at `unit.coord`. Without this check a client can name any
 * on-map hex as the sole path entry and teleport there for one move point.
 */
function findNonAdjacentStep(
  startCoord: HexKey,
  path: readonly HexKey[],
  wrap: WrapContext,
): { from: HexKey; to: HexKey } | null {
  let from = startCoord;
  for (const to of path) {
    if (!isAdjacent(from, to, wrap)) {
      return { from, to };
    }
    from = to;
  }
  return null;
}

/** Validates a `MoveUnit` command against the given state and unit. */
export function validateMoveUnit(
  state: GameState,
  command: Command & { kind: "MoveUnit" },
  unit: Unit,
): CommandRejection | null {
  if (command.path.length === 0) {
    return { code: "malformed", message: "Path must not be empty" };
  }
  for (const hex of command.path) {
    if (!state.map.tiles[hex]) {
      return { code: "illegal", message: `Unknown tile: ${hex}` };
    }
  }
  const badStep = findNonAdjacentStep(unit.coord, command.path, toWrapContext(state.map));
  if (badStep) {
    return {
      code: "illegal",
      message: `Path is not contiguous: ${badStep.to} is not adjacent to ${badStep.from}`,
    };
  }
  const firstCost = stepCost(state, unit.id as UnitId, unit.coord, command.path[0]!);
  if (!Number.isFinite(firstCost) || firstCost > unit.movesLeft) {
    return { code: "illegal", message: "First move exceeds available moves" };
  }
  return null;
}

export function handleMoveUnit(
  state: GameState,
  command: Command & { kind: "MoveUnit" },
): CommandResult {
  const unit = state.entities.units[command.unitId]!;
  const prevCoord = unit.coord;
  let movesLeft = unit.movesLeft;
  let embarked = unit.isEmbarked;
  let traveledCount = 0;
  while (traveledCount < command.path.length) {
    const from = traveledCount === 0 ? unit.coord : command.path[traveledCount - 1]!;
    const cost = stepCost(state, unit.id as UnitId, from, command.path[traveledCount]!);
    if (!Number.isFinite(cost) || cost > movesLeft) break;
    movesLeft -= cost;
    traveledCount++;
    const destination = state.map.tiles[command.path[traveledCount - 1]!]!;
    const enteringWater = isWater(destination);
    if (enteringWater !== embarked) {
      embarked = enteringWater;
      if (enteringWater) movesLeft = 0;
      if (enteringWater) break;
    }
  }
  const traveled = command.path.slice(0, traveledCount);
  const newMovesLeft = movesLeft;
  const to = traveled[traveled.length - 1] ?? unit.coord;

  const movedUnit = new UnitClass(
    unit.id,
    unit.createdTurn,
    unit.defId,
    unit.ownerId,
    to,
    unit.hp,
    newMovesLeft,
    unit.movesMax,
    unit.promotions,
    unit.experience,
    unit.fortifiedTurns,
    embarked,
    command.path.slice(traveledCount),
  );

  const nextUnits = { ...state.entities.units, [command.unitId]: movedUnit };
  const nextTiles = { ...state.map.tiles };
  if (to !== prevCoord) {
    const source = state.map.tiles[prevCoord]!;
    const destination = state.map.tiles[to]!;
    nextTiles[prevCoord] = withOccupants(
      source,
      source.occupantUnitIds.filter((id) => id !== command.unitId),
    );
    nextTiles[to] = withOccupants(
      destination,
      destination.occupantUnitIds.includes(command.unitId)
        ? destination.occupantUnitIds
        : [...destination.occupantUnitIds, command.unitId],
    );
  }
  const events: GameEvent[] = [
    {
      kind: "UnitMoved",
      unitId: command.unitId,
      from: prevCoord,
      to,
      movesRemaining: newMovesLeft,
    },
  ];

  const nextState = {
    ...state,
    map: { ...state.map, tiles: nextTiles },
    entities: { ...state.entities, units: nextUnits },
  };
  const visibility = updatePlayerVisibilityWithEvents(nextState, command.playerId, to, 2);
  return {
    ok: true,
    state: visibility.state,
    events: [...events, ...visibility.events],
  };
}
