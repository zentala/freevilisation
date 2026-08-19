import { describe, it, expect } from "vitest";
import type { GameState } from "../game-state.js";
import type { PlayerId, UnitId, HexKey } from "../ids.js";
import type { TerrainDefId, UnitDefId, CivDefId, DefId } from "../ids.js";
import type { Command } from "./types.js";
import { makeEntityId } from "../ids.js";
import { Player } from "../entities/Player.js";
import { Unit } from "../entities/Unit.js";
import { City } from "../entities/City.js";
import { Tile } from "../entities/Tile.js";
import { validate, applyCommand } from "./pipeline.js";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;
const U1 = "u1" as UnitId;
const U2 = "u2" as UnitId;
const TERRAIN = "terrain_grassland" as TerrainDefId;
const WARRIOR = "unit_warrior" as UnitDefId;
const ROME = "civ_rome" as CivDefId;
const EGYPT = "civ_egypt" as CivDefId;

function makeTile(hexKey: HexKey, seq: number): Tile {
  return new Tile(
    makeEntityId(seq), 0, hexKey, TERRAIN,
    null, null, null, false, null, null, null, [],
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

  const p1 = new Player(makeEntityId(10), 0, ROME, false, false, 0, 0, [], [], 0, 0, null, true, null);
  const p2 = new Player(makeEntityId(11), 0, EGYPT, false, false, 0, 0, [], [], 0, 0, null, true, null);

  const u1 = new Unit(U1, 0, WARRIOR, P1, "0,0" as HexKey, 10, 3, 3, [], 0, 0, false);
  const u2 = new Unit(U2, 0, WARRIOR, P2, "2,2" as HexKey, 10, 3, 3, [], 0, 0, false);

  return {
    gameId: makeEntityId(0),
    turn: 1,
    phase: "playing",
    activePlayerId: P1,
    players: { [P1]: p1, [P2]: p2 },
    playerOrder: [P1, P2],
    map: { width: 3, height: 3, isWraparoundX: false, tiles },
    entities: { units: { [U1]: u1, [U2]: u2 }, cities: {} },
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
    nextEntitySeq: 0,
    winnerPlayerId: null,
    victoryType: null,
  };
}

describe("validate", () => {
  it("returns null for a valid MoveUnit", () => {
    const state = makeBaseState();
    const result = validate(state, {
      kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey],
    });
    expect(result).toBeNull();
  });

  it("rejects unknown command kind", () => {
    const state = makeBaseState();
    const badCmd = { kind: "Attack", playerId: P1 } as unknown as Command;
    const result = validate(state, badCmd);
    expect(result).not.toBeNull();
    expect(result!.code).toBe("malformed");
  });

  it("rejects when phase is not playing", () => {
    const state = makeBaseState();
    state.phase = "setup";
    const result = validate(state, { kind: "EndTurn", playerId: P1 });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("not_your_turn");
  });

  it("rejects when not the active player", () => {
    const state = makeBaseState();
    const result = validate(state, { kind: "EndTurn", playerId: P2 });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("not_your_turn");
  });

  it("rejects unknown unit", () => {
    const state = makeBaseState();
    const result = validate(state, {
      kind: "MoveUnit", playerId: P1, unitId: "nonexistent" as UnitId, path: ["1,0" as HexKey],
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("unknown_entity");
  });

  it("rejects unit owned by another player", () => {
    const state = makeBaseState();
    const result = validate(state, {
      kind: "MoveUnit", playerId: P1, unitId: U2, path: ["1,2" as HexKey],
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("not_owner");
  });
});

describe("applyCommand — MoveUnit", () => {
  it("moves a unit and emits UnitMoved event", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    const moved = result.state.entities.units[U1]!;
    expect(moved.coord).toBe("1,0");
    expect(moved.movesLeft).toBe(2);
    expect(result.events).toEqual([
      { kind: "UnitMoved", unitId: U1, from: "0,0", to: "1,0", movesRemaining: 2 },
    ]);
  });

  it("does not mutate the input state", () => {
    const state = makeBaseState();
    const origUnits = state.entities.units;
    applyCommand(state, {
      kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey],
    });
    expect(state.entities.units).toBe(origUnits);
    expect(state.entities.units[U1]!.coord).toBe("0,0");
  });

  it("returns a new state object", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state).not.toBe(state);
  });
});

describe("applyCommand — FoundCity", () => {
  it("founds a city and emits CityFounded event", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "FoundCity", playerId: P1, unitId: U1, name: "Rome",
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
      kind: "FoundCity", playerId: P1, unitId: U1, name: "Rome",
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
      kind: "FoundCity", playerId: P1, unitId: U1, name: "Rome",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.nextEntitySeq).toBe(6);
  });

  it("rejects empty city name", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "FoundCity", playerId: P1, unitId: U1, name: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("malformed");
  });

  it("rejects founding city at location with existing city", () => {
    const state = makeBaseState();
    const city = new City(
      makeEntityId(20), 0, P1, 0, "0,0" as HexKey, "Existing", 1,
      0, 0, [], [], [], [], 0, 0, true,
    );
    state.entities.cities = { [city.id]: city };
    const result = applyCommand(state, {
      kind: "FoundCity", playerId: P1, unitId: U1, name: "NewRome",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("illegal");
  });
});

describe("applyCommand — EndTurn", () => {
  it("advances to the next player", () => {
    const state = makeBaseState();
    const result = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.activePlayerId).toBe(P2);
    expect(result.state.turn).toBe(1);
  });

  it("wraps past the last player and increments turn", () => {
    const state = makeBaseState();
    state.activePlayerId = P2;
    const result = applyCommand(state, { kind: "EndTurn", playerId: P2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.activePlayerId).toBe(P1);
    expect(result.state.turn).toBe(2);
  });

  it("emits TurnEnded then TurnStarted events", () => {
    const state = makeBaseState();
    const result = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.events).toEqual([
      { kind: "TurnEnded", turn: 1, activePlayerId: P1 },
      { kind: "TurnStarted", turn: 1, activePlayerId: P2 },
    ]);
  });

  it("wrapping emits correct turn numbers", () => {
    const state = makeBaseState();
    state.activePlayerId = P2;
    const result = applyCommand(state, { kind: "EndTurn", playerId: P2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.events).toEqual([
      { kind: "TurnEnded", turn: 1, activePlayerId: P2 },
      { kind: "TurnStarted", turn: 2, activePlayerId: P1 },
    ]);
  });
});

describe("applyCommand — rejections", () => {
  it("rejects MoveUnit with empty path", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit", playerId: P1, unitId: U1, path: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("malformed");
  });

  it("rejects MoveUnit to unknown tile", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit", playerId: P1, unitId: U1, path: ["99,99" as HexKey],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("illegal");
  });

  it("rejects MoveUnit exceeding available moves", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit", playerId: P1, unitId: U1,
      path: ["1,0" as HexKey, "2,0" as HexKey, "2,1" as HexKey, "2,2" as HexKey],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("illegal");
  });
});

describe("applyCommand — immutability", () => {
  it("input units and cities records are unchanged after MoveUnit", () => {
    const state = makeBaseState();
    const origUnits = state.entities.units;
    const origCities = state.entities.cities;
    applyCommand(state, {
      kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey],
    });
    expect(state.entities.units).toBe(origUnits);
    expect(state.entities.cities).toBe(origCities);
  });

  it("input units and cities records are unchanged after FoundCity", () => {
    const state = makeBaseState();
    const origUnits = state.entities.units;
    const origCities = state.entities.cities;
    applyCommand(state, {
      kind: "FoundCity", playerId: P1, unitId: U1, name: "Rome",
    });
    expect(state.entities.units).toBe(origUnits);
    expect(state.entities.cities).toBe(origCities);
  });

  it("input units and cities records are unchanged after EndTurn", () => {
    const state = makeBaseState();
    const origUnits = state.entities.units;
    const origCities = state.entities.cities;
    applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(state.entities.units).toBe(origUnits);
    expect(state.entities.cities).toBe(origCities);
  });
});
