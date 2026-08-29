import type { GameState } from "../game-state.js";
import type { GameEvent } from "../commands/types.js";
import type { City } from "../entities/City.js";
import type { CityId, DefId } from "../ids.js";

export type ProductionKind = "unit" | "building" | "wonder";

export interface ProductionCompletion {
  readonly kind: ProductionKind;
  readonly defId: DefId;
}

export interface CityTickResult {
  readonly city: City;
  readonly grewFrom: number | null;
  readonly productionCompleted: ProductionCompletion | null;
}

export interface GrowthProductionRules {
  readonly tickCity: (state: GameState, city: City) => CityTickResult;
}

export interface GrowthProductionResult {
  readonly state: GameState;
  readonly events: GameEvent[];
}

const NO_TICK: GrowthProductionRules = {
  tickCity: (_state, city) => ({ city, grewFrom: null, productionCompleted: null }),
};

/** Resolves each city once in stable id order, delegating E11's city tick. */
export function runGrowthProduction(
  state: GameState,
  rules: GrowthProductionRules = NO_TICK,
): GrowthProductionResult {
  const nextCities = { ...state.entities.cities };
  const events: GameEvent[] = [];

  for (const [rawCityId, city] of Object.entries(state.entities.cities).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const cityId = rawCityId as CityId;
    const result = rules.tickCity(
      { ...state, entities: { ...state.entities, cities: nextCities } },
      city,
    );
    nextCities[cityId] = result.city;
    if (result.grewFrom !== null) {
      events.push({ kind: "CityGrew", cityId, newPopulation: result.city.population });
    }
    if (result.productionCompleted !== null) {
      events.push({
        kind: "ProductionCompleted",
        cityId,
        item: result.productionCompleted.kind,
        defId: result.productionCompleted.defId,
      });
    }
  }

  return { state: { ...state, entities: { ...state.entities, cities: nextCities } }, events };
}
