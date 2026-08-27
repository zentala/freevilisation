import { describe, expect, it } from "vitest";
import { City } from "../entities/City.js";
import { makeEntityId } from "../ids.js";
import type { CityId, DefId, HexKey } from "../ids.js";
import { P1, makeBaseState } from "../commands/test-fixtures.js";
import { runGrowthProduction } from "./growth-production.js";

const C1 = "city_1" as CityId;
const C2 = "city_2" as CityId;
const BUILDING = "building_granary" as DefId;

function city(id: CityId, population: number): City {
  return new City(
    makeEntityId(id === C1 ? 101 : 102),
    0,
    P1,
    0,
    "0,0" as HexKey,
    id,
    population,
    0,
    0,
    [],
    [],
    [],
    [],
    100,
    10,
    false,
  );
}

describe("runGrowthProduction", () => {
  it("ticks every city once in stable id order", () => {
    const state = makeBaseState();
    state.entities.cities[C2] = city(C2, 2);
    state.entities.cities[C1] = city(C1, 1);
    const visited: string[] = [];

    const result = runGrowthProduction(state, {
      tickCity: (_state, currentCity) => {
        visited.push(currentCity.name);
        return { city: currentCity, grewFrom: null, productionCompleted: null };
      },
    });

    expect(visited).toEqual([C1, C2]);
    expect(result.state.entities.cities).not.toBe(state.entities.cities);
  });

  it("emits growth and production events from the city tick", () => {
    const state = makeBaseState();
    state.entities.cities[C1] = city(C1, 3);
    const grown = city(C1, 4);

    const result = runGrowthProduction(state, {
      tickCity: () => ({
        city: grown,
        grewFrom: 3,
        productionCompleted: { kind: "building", defId: BUILDING },
      }),
    });

    expect(result.events).toEqual([
      { kind: "CityGrew", cityId: C1, newPopulation: 4 },
      { kind: "ProductionCompleted", cityId: C1, item: "building", defId: BUILDING },
    ]);
  });

  it("does not mutate the input state or emit absent completions", () => {
    const state = makeBaseState();
    state.entities.cities[C1] = city(C1, 1);
    const result = runGrowthProduction(state);

    expect(result.events).toEqual([]);
    expect(result.state.entities.cities[C1]!.population).toBe(1);
    expect(state.entities.cities[C1]!.population).toBe(1);
  });
});
