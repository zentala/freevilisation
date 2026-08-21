import { describe, it, expect } from "vitest";
import type { HexKey } from "../ids.js";
import { makeEntityId } from "../ids.js";
import { City } from "../entities/City.js";
import { applyCommand } from "./pipeline.js";
import { P1, U1, makeBaseState } from "./test-fixtures.js";

describe("applyCommand — FoundCity", () => {
  it("founds a city and emits CityFounded event", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "FoundCity",
      playerId: P1,
      unitId: U1,
      name: "Rome",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    const cities = Object.values(result.state.entities.cities);
    expect(cities).toHaveLength(1);
    const city = cities[0]!;
    expect(city.name).toBe("Rome");
    expect(city.centerTile).toBe("0,0");
    expect(city.ownerId).toBe(P1);
    expect(city.isCapital).toBe(true);
    expect(city.population).toBe(1);
    expect(result.state.entities.units[U1]).toBeUndefined();
    expect(result.state.nextEntitySeq).toBe(1);
    expect(result.events).toEqual([
      { kind: "CityFounded", cityId: city.id, playerId: P1, coord: "0,0" },
    ]);
  });

  it("removes the founding unit", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "FoundCity",
      playerId: P1,
      unitId: U1,
      name: "Rome",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.entities.units[U1]).toBeUndefined();
    expect(Object.keys(result.state.entities.units)).toHaveLength(1);
  });

  it("increments nextEntitySeq", () => {
    const state = makeBaseState();
    state.nextEntitySeq = 5;
    const result = applyCommand(state, {
      kind: "FoundCity",
      playerId: P1,
      unitId: U1,
      name: "Rome",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.nextEntitySeq).toBe(6);
  });

  it("rejects empty city name", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "FoundCity",
      playerId: P1,
      unitId: U1,
      name: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("malformed");
  });

  it("rejects founding city at location with existing city", () => {
    const state = makeBaseState();
    const city = new City(
      makeEntityId(20),
      0,
      P1,
      0,
      "0,0" as HexKey,
      "Existing",
      1,
      0,
      0,
      [],
      [],
      [],
      [],
      0,
      0,
      true,
    );
    state.entities.cities = { [city.id]: city };
    const result = applyCommand(state, {
      kind: "FoundCity",
      playerId: P1,
      unitId: U1,
      name: "NewRome",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("illegal");
  });

  it("input units and cities records are unchanged after FoundCity", () => {
    const state = makeBaseState();
    const origUnits = state.entities.units;
    const origCities = state.entities.cities;
    applyCommand(state, {
      kind: "FoundCity",
      playerId: P1,
      unitId: U1,
      name: "Rome",
    });
    expect(state.entities.units).toBe(origUnits);
    expect(state.entities.cities).toBe(origCities);
  });
});
