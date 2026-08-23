import { describe, it, expect } from "vitest";
import type { GameState } from "./game-state.js";
import type { PlayerId, UnitId, CityId, HexKey } from "./ids.js";
import type { TerrainDefId, UnitDefId, CivDefId, DefId } from "./ids.js";
import { makeEntityId } from "./ids.js";
import { Player } from "./entities/Player.js";
import { Unit } from "./entities/Unit.js";
import { City } from "./entities/City.js";
import { Tile } from "./entities/Tile.js";
import { assertInvariants } from "./invariants.js";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;
const U1 = "u1" as UnitId;
const C1 = "c1" as CityId;
const TERRAIN = "terrain_grassland" as TerrainDefId;
const WARRIOR = "unit_warrior" as UnitDefId;
const ROME = "civ_rome" as CivDefId;
const EGYPT = "civ_egypt" as CivDefId;

function makeTile(hexKey: HexKey, seq: number): Tile {
  return new Tile(
    makeEntityId(seq),
    0,
    hexKey,
    TERRAIN,
    null,
    null,
    null,
    false,
    false,
    false,
    null,
    null,
    null,
    [],
  );
}

function makeBaseState(): GameState {
  const tiles: Record<HexKey, Tile> = {};
  let seq = 900;
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      const key = `${x},${y}` as HexKey;
      tiles[key] = makeTile(key, seq++);
    }
  }

  const p1 = new Player(
    makeEntityId(10),
    0,
    ROME,
    false,
    false,
    0,
    0,
    [],
    [],
    0,
    0,
    null,
    true,
    null,
  );
  const p2 = new Player(
    makeEntityId(11),
    0,
    EGYPT,
    false,
    false,
    0,
    0,
    [],
    [],
    0,
    0,
    null,
    true,
    null,
  );

  const u1 = new Unit(U1, 0, WARRIOR, P1, "0,0" as HexKey, 10, 3, 3, [], 0, 0, false);
  const c1 = new City(C1, 0, P1, 0, "1,1" as HexKey, "Rome", 1, 0, 0, [], [], [], [], 0, 0, true);

  return {
    gameId: makeEntityId(0),
    turn: 1,
    phase: "playing",
    activePlayerId: P1,
    players: { [P1]: p1, [P2]: p2 },
    playerOrder: [P1, P2],
    map: { width: 3, height: 3, isWraparoundX: false, tiles },
    entities: { units: { [U1]: u1 }, cities: { [C1]: c1 } },
    rngState: { algorithm: "mulberry32", state: 0, drawCount: 0 },
    rulesetRef: { id: "default", version: "0.1.0", contentHash: "abc" },
    settings: {
      mapSeed: 42,
      mapSize: "tiny",
      victoryConditions: [],
      difficulty: "diff_normal" as DefId<"difficulty">,
      turnTimerSeconds: null,
      simultaneousTurns: false,
    },
    nextEntitySeq: 1,
    winnerPlayerId: null,
    victoryType: null,
  };
}

describe("assertInvariants", () => {
  it("passes on a valid fixture", () => {
    expect(() => assertInvariants(makeBaseState())).not.toThrow();
  });

  it("fails when playerOrder contains unknown player", () => {
    const state = makeBaseState();
    state.playerOrder = [P1, "ghost" as PlayerId];
    expect(() => assertInvariants(state)).toThrow(/playerOrder contains unknown player/);
  });

  it("fails when player exists but is not in playerOrder", () => {
    const state = makeBaseState();
    state.playerOrder = [P1];
    expect(() => assertInvariants(state)).toThrow(/exists but is not in playerOrder/);
  });

  it("fails when unit has unknown ownerId", () => {
    const state = makeBaseState();
    const u2 = new Unit(
      "u2" as UnitId,
      0,
      WARRIOR,
      "ghost" as PlayerId,
      "0,0" as HexKey,
      10,
      3,
      3,
      [],
      0,
      0,
      false,
    );
    state.entities.units["u2" as UnitId] = u2;
    expect(() => assertInvariants(state)).toThrow(/unit .* has unknown ownerId/);
  });

  it("fails when unit references unknown tile", () => {
    const state = makeBaseState();
    const u2 = new Unit(
      "u2" as UnitId,
      0,
      WARRIOR,
      P1,
      "99,99" as HexKey,
      10,
      3,
      3,
      [],
      0,
      0,
      false,
    );
    state.entities.units["u2" as UnitId] = u2;
    expect(() => assertInvariants(state)).toThrow(/unit .* references unknown tile/);
  });

  it("fails when city has unknown ownerId", () => {
    const state = makeBaseState();
    const c2 = new City(
      "c2" as CityId,
      0,
      "ghost" as PlayerId,
      0,
      "1,1" as HexKey,
      "Ghost",
      1,
      0,
      0,
      [],
      [],
      [],
      [],
      0,
      0,
      false,
    );
    state.entities.cities["c2" as CityId] = c2;
    expect(() => assertInvariants(state)).toThrow(/city .* has unknown ownerId/);
  });

  it("fails when city references unknown tile", () => {
    const state = makeBaseState();
    const c2 = new City(
      "c2" as CityId,
      0,
      P1,
      0,
      "99,99" as HexKey,
      "Bad",
      1,
      0,
      0,
      [],
      [],
      [],
      [],
      0,
      0,
      false,
    );
    state.entities.cities["c2" as CityId] = c2;
    expect(() => assertInvariants(state)).toThrow(/city .* references unknown tile/);
  });

  it("fails when turn < 0", () => {
    const state = makeBaseState();
    state.turn = -1;
    expect(() => assertInvariants(state)).toThrow(/turn must be >= 0/);
  });

  it("fails when rngState.drawCount < 0", () => {
    const state = makeBaseState();
    state.rngState.drawCount = -1;
    expect(() => assertInvariants(state)).toThrow(/rngState.drawCount must be >= 0/);
  });
});
