import type { GameState } from "../game-state.js";
import type { Command, CommandResult, CommandRejection, GameEvent } from "./types.js";
import type { HexKey } from "../ids.js";
import type { Unit } from "../entities/Unit.js";
import { Unit as UnitClass } from "../entities/Unit.js";
import { fromHexKey, toHexKey } from "../hex/coords.js";
import { neighbors, type WrapContext } from "../hex/hex-math.js";
import { toWrapContext } from "../hex/game-map.js";

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
  if (command.path.length > unit.movesLeft) {
    return { code: "illegal", message: "Not enough moves" };
  }
  const badStep = findNonAdjacentStep(unit.coord, command.path, toWrapContext(state.map));
  if (badStep) {
    return {
      code: "illegal",
      message: `Path is not contiguous: ${badStep.to} is not adjacent to ${badStep.from}`,
    };
  }
  return null;
}

export function handleMoveUnit(
  state: GameState,
  command: Command & { kind: "MoveUnit" },
): CommandResult {
  const unit = state.entities.units[command.unitId]!;
  const prevCoord = unit.coord;
  // Cost is 1 move point per step (placeholder until terrain movement
  // cost lands, E10 — no per-tile cost function exists yet to run
  // through `edgeCost` from hex/graph.ts).
  const newMovesLeft = unit.movesLeft - command.path.length;
  const to = command.path[command.path.length - 1]!;

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
    unit.isEmbarked,
  );

  const nextUnits = { ...state.entities.units, [command.unitId]: movedUnit };
  const events: GameEvent[] = [
    {
      kind: "UnitMoved",
      unitId: command.unitId,
      from: prevCoord,
      to,
      movesRemaining: newMovesLeft,
    },
  ];

  return {
    ok: true,
    state: { ...state, entities: { ...state.entities, units: nextUnits } },
    events,
  };
}
