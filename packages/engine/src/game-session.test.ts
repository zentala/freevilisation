import { describe, it, expect, vi } from "vitest";
import type { GameState } from "./game-state.js";
import type { PlayerId, UnitId, HexKey, DefId } from "./ids.js";
import type { TerrainDefId, UnitDefId, CivDefId } from "./ids.js";
import { makeEntityId } from "./ids.js";
import { Player } from "./entities/Player.js";
import { Unit } from "./entities/Unit.js";
import { Tile } from "./entities/Tile.js";
import { GameSession } from "./game-session.js";
import { EventBus } from "./event-bus.js";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;
const U1 = "u1" as UnitId;
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

  return {
    gameId: makeEntityId(0),
    turn: 1,
    phase: "playing",
    activePlayerId: P1,
    players: { [P1]: p1, [P2]: p2 },
    playerOrder: [P1, P2],
    map: { width: 3, height: 3, isWraparoundX: false, tiles },
    entities: { units: { [U1]: u1 }, cities: {} },
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

describe("GameSession", () => {
  it("an accepted MoveUnit advances session.state and appends to commandLog", () => {
    const state = makeBaseState();
    const session = new GameSession(state);

    const result = session.dispatch({
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });

    expect(result.ok).toBe(true);
    expect(session.state.entities.units[U1]!.coord).toBe("1,0");
    expect(session.commandLog).toHaveLength(1);
    expect(session.commandLog[0]!.kind).toBe("MoveUnit");
  });

  it("subscribers receive events, and session.state is updated during emit", () => {
    const state = makeBaseState();
    const session = new GameSession(state);
    let stateDuringEmit: GameState | null = null;

    session.bus.on(() => {
      stateDuringEmit = session.state;
    });

    session.dispatch({
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });

    expect(stateDuringEmit).not.toBeNull();
    expect(stateDuringEmit!.entities.units[U1]!.coord).toBe("1,0");
  });

  it("a rejected command leaves session.state identical by reference, commandLog unchanged, and emits nothing", () => {
    const state = makeBaseState();
    const session = new GameSession(state);
    const spy = vi.fn();
    session.bus.on(spy);

    const before = session.state;
    const logBefore = session.commandLog.length;

    const result = session.dispatch({
      kind: "MoveUnit",
      playerId: P2,
      unitId: U1,
      path: ["1,0" as HexKey],
    });

    expect(result.ok).toBe(false);
    expect(session.state).toBe(before);
    expect(session.commandLog).toHaveLength(logBefore);
    expect(spy).not.toHaveBeenCalled();
  });

  it("three accepted commands produce a commandLog of exactly those three, in order", () => {
    const state = makeBaseState();
    const session = new GameSession(state);

    session.dispatch({ kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey] });
    session.dispatch({ kind: "MoveUnit", playerId: P1, unitId: U1, path: ["2,0" as HexKey] });
    session.dispatch({ kind: "EndTurn", playerId: P1 });

    expect(session.commandLog).toHaveLength(3);
    expect(session.commandLog.map((c) => c.kind)).toEqual(["MoveUnit", "MoveUnit", "EndTurn"]);
  });

  it("session constructed without a bus still works and exposes one", () => {
    const state = makeBaseState();
    const session = new GameSession(state);

    expect(session.bus).toBeInstanceOf(EventBus);

    const result = session.dispatch({
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });
    expect(result.ok).toBe(true);
  });
});
