import { describe, it, expect } from "vitest";
import { serialize, deserialize, stateHash } from "./serialization.js";
import { createInitialGameState } from "./game-state.js";
import { Registry } from "./registry.js";
import { makeEntityId } from "./ids.js";
import { Unit } from "./entities/Unit.js";
import { City } from "./entities/City.js";
import { Tile } from "./entities/Tile.js";
import type { GameSettings } from "./game-state.js";
import type { HexKey, UnitDefId, PlayerId, UnitId, CityId } from "./ids.js";

const EMPTY_REGISTRY = Registry.load({
  units: [],
  buildings: [],
  terrains: [],
  techs: [],
  civs: [],
});

const DEFAULT_SETTINGS: GameSettings = {
  mapSeed: 42,
  mapSize: "small",
  victoryConditions: [],
  difficulty: "settler" as GameSettings["difficulty"],
  turnTimerSeconds: null,
  simultaneousTurns: false,
};

const DEFAULT_RULESET_REF = {
  id: "base",
  version: "0.1.0",
  contentHash: "abc123",
};

function makeNonTrivialState() {
  const state = createInitialGameState(42, DEFAULT_SETTINGS, EMPTY_REGISTRY, DEFAULT_RULESET_REF);
  const playerId = makeEntityId(0) as unknown as PlayerId;
  state.players[playerId] = {
    id: playerId,
    type: "player",
    ownerId: playerId,
    createdTurn: 0,
    civDefId: "def_civ:rome" as never,
    isAI: false,
    isBarbarian: false,
    gold: 100,
    goldPerTurn: 5,
    researchedTechs: [],
    adoptedPolicies: [],
    culturePerTurn: 2,
    cultureStock: 0,
    capitalCityId: null,
    isAlive: true,
    eliminatedTurn: null,
    components: new Map(),
  } as never;
  state.playerOrder = [playerId];

  const unitId = makeEntityId(1) as unknown as UnitId;
  state.entities.units[unitId] = new Unit(
    unitId,
    0,
    "def_unit:warrior" as UnitDefId,
    playerId,
    "0,0" as HexKey,
    100,
    2,
    2,
    [],
    0,
    0,
    false,
  );

  const cityId = makeEntityId(2) as unknown as CityId;
  state.entities.cities[cityId] = new City(
    cityId,
    0,
    playerId,
    0,
    "1,1" as HexKey,
    "Rome",
    1,
    0,
    0,
    [],
    [],
    [],
    [],
    100,
    10,
    true,
  );

  // Real Tile instances, not object literals: a Tile derives its `ownerId`
  // from `ownerPlayer`, so a literal that sets one without the other builds a
  // state the domain model cannot represent, and no round-trip can reproduce it.
  state.map.tiles["0,0" as HexKey] = new Tile(
    makeEntityId(3),
    0,
    "0,0" as HexKey,
    "def_terrain:grassland" as never,
    null,
    null,
    null,
    false,
    null,
    playerId,
    null,
    [],
  );

  state.map.tiles["1,1" as HexKey] = new Tile(
    makeEntityId(4),
    0,
    "1,1" as HexKey,
    "def_terrain:plains" as never,
    null,
    null,
    null,
    true,
    null,
    playerId,
    null,
    [],
  );

  return state;
}

describe("serialize", () => {
  it("produces same output on repeated calls", () => {
    const state = makeNonTrivialState();
    const s1 = serialize(state);
    const s2 = serialize(state);
    expect(s1).toBe(s2);
  });

  it("output is valid JSON", () => {
    const state = makeNonTrivialState();
    const parsed = JSON.parse(serialize(state));
    expect(parsed).toBeDefined();
    expect(parsed.turn).toBe(0);
  });
});

describe("deserialize", () => {
  it("round-trip: deserialize(serialize(state)) produces identical serialize output", () => {
    const state = makeNonTrivialState();
    const original = serialize(state);
    const restored = deserialize(original, EMPTY_REGISTRY);
    const reSerialized = serialize(restored);
    expect(reSerialized).toBe(original);
  });

  it("restored state has correct types for entities", () => {
    const state = makeNonTrivialState();
    const json = serialize(state);
    const restored = deserialize(json, EMPTY_REGISTRY);
    const unitIds = Object.keys(restored.entities.units);
    expect(unitIds.length).toBe(1);
    const unit = restored.entities.units[unitIds[0]! as UnitId] as Unit;
    expect(unit).toBeInstanceOf(Unit);
    expect(unit.hp).toBe(100);
  });

  it("restored city is a City instance", () => {
    const state = makeNonTrivialState();
    const json = serialize(state);
    const restored = deserialize(json, EMPTY_REGISTRY);
    const cityIds = Object.keys(restored.entities.cities);
    expect(cityIds.length).toBe(1);
    const city = restored.entities.cities[cityIds[0]! as CityId] as City;
    expect(city).toBeInstanceOf(City);
    expect(city.name).toBe("Rome");
  });
});

describe("stateHash", () => {
  it("same state structure produces same hash", () => {
    const a = makeNonTrivialState();
    const b = makeNonTrivialState();
    expect(stateHash(a)).toBe(stateHash(b));
  });

  it("different states produce different hashes", () => {
    const a = makeNonTrivialState();
    const b = makeNonTrivialState();
    b.turn = 1;
    expect(stateHash(a)).not.toBe(stateHash(b));
  });

  it("hash is a hex string", () => {
    const state = makeNonTrivialState();
    const hash = stateHash(state);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hash is stable across calls", () => {
    const state = makeNonTrivialState();
    const h1 = stateHash(state);
    const h2 = stateHash(state);
    expect(h1).toBe(h2);
  });
});
