import type { GameState } from "../game-state.js";
import type { PlayerId } from "../ids.js";
import type { GameEvent } from "../commands/types.js";
import { Unit } from "../entities/Unit.js";

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
  for (const [id, unit] of unitEntries) {
    nextUnits[id as keyof typeof nextUnits] = new Unit(
      unit.id,
      unit.createdTurn,
      unit.defId,
      unit.ownerId,
      unit.coord,
      unit.hp,
      unit.movesMax,
      unit.movesMax,
      unit.promotions,
      unit.experience,
      unit.fortifiedTurns,
      unit.isEmbarked,
    );
  }

  return {
    state: { ...state, entities: { ...state.entities, units: nextUnits } },
    events: [],
  };
}
