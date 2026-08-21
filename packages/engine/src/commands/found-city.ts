import type { GameState } from "../game-state.js";
import type { Command, CommandResult, CommandRejection, GameEvent } from "./types.js";
import type { CityId } from "../ids.js";
import type { Unit } from "../entities/Unit.js";
import { City } from "../entities/City.js";
import { makeEntityId } from "../ids.js";

/** Validates a `FoundCity` command against the given state and unit. */
export function validateFoundCity(
  state: GameState,
  command: Command & { kind: "FoundCity" },
  unit: Unit,
): CommandRejection | null {
  if (!command.name || command.name.length === 0) {
    return { code: "malformed", message: "City name must not be empty" };
  }
  const unitCoord = unit.coord;
  for (const city of Object.values(state.entities.cities)) {
    if (city.centerTile === unitCoord) {
      return { code: "illegal", message: "A city already exists at this location" };
    }
  }
  return null;
}

export function handleFoundCity(
  state: GameState,
  command: Command & { kind: "FoundCity" },
): CommandResult {
  const unit = state.entities.units[command.unitId]!;
  const cityId = makeEntityId(state.nextEntitySeq) as CityId;
  const isFirstCity = !Object.values(state.entities.cities).some(
    (c) => c.ownerId === command.playerId,
  );

  const city = new City(
    cityId,
    state.turn,
    command.playerId,
    state.turn,
    unit.coord,
    command.name,
    1,
    0,
    0,
    [],
    [],
    [],
    [],
    0,
    0,
    isFirstCity,
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
