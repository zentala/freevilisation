import type { GameState } from "../game-state.js";
import type { PlayerId, UnitId } from "../ids.js";
import type { GameEvent } from "../commands/types.js";
import { Unit } from "../entities/Unit.js";
import { stepCost } from "../movement/step.js";

export type MovesMaxModifier = (state: GameState, unit: Unit) => number;

export type TurnSystem = (
  state: GameState,
  playerId: PlayerId,
) => {
  state: GameState;
  events: GameEvent[];
};

export function refreshUnitMoves(
  state: GameState,
  playerId: PlayerId,
  movesMaxModifier: MovesMaxModifier = (_state, unit) => unit.movesMax,
): {
  state: GameState;
  events: GameEvent[];
} {
  const unitEntries = Object.entries(state.entities.units)
    .filter(([, unit]) => unit.ownerId === playerId)
    .sort(([a], [b]) => a.localeCompare(b));

  if (unitEntries.length === 0) {
    return { state, events: [] };
  }

  const nextUnits = { ...state.entities.units };
  const events: GameEvent[] = [];
  for (const [id, unit] of unitEntries) {
    let coord = unit.coord;
    const movesMax = movesMaxModifier(state, unit);
    if (!Number.isFinite(movesMax) || movesMax < 0) {
      throw new Error("movesMax modifier must return a finite non-negative number");
    }
    let movesLeft = movesMax;
    let remaining = [...unit.moveOrder];
    const eventsForUnit: GameEvent[] = [];
    while (remaining.length > 0) {
      const cost = stepCost(state, unit.id as UnitId, coord, remaining[0]!);
      if (!Number.isFinite(cost) || cost > movesLeft) break;
      const next = remaining.shift()!;
      eventsForUnit.push({
        kind: "UnitMoved",
        unitId: unit.id as UnitId,
        from: coord,
        to: next,
        movesRemaining: movesLeft - cost,
      });
      coord = next;
      movesLeft -= cost;
    }
    events.push(...eventsForUnit);
    nextUnits[id as keyof typeof nextUnits] = new Unit(
      unit.id,
      unit.createdTurn,
      unit.defId,
      unit.ownerId,
      coord,
      unit.hp,
      movesLeft,
      movesMax,
      unit.promotions,
      unit.experience,
      unit.fortifiedTurns,
      unit.isEmbarked,
      remaining,
    );
  }

    return {
    state: { ...state, entities: { ...state.entities, units: nextUnits } },
    events,
  };
}
