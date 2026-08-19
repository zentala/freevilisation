import { describe, it, expect } from "vitest";
import type { GameState } from "../game-state.js";
import type { PlayerId, UnitId, HexKey } from "../ids.js";
import type { TerrainDefId, UnitDefId, CivDefId, DefId } from "../ids.js";
import type { Command } from "../commands/types.js";
import { makeEntityId } from "../ids.js";
import { Player } from "../entities/Player.js";
import { Unit } from "../entities/Unit.js";
import { Tile } from "../entities/Tile.js";
import { replay, assertDeterministic } from "./determinism-harness.js";

const P1 = "p1" as PlayerId;
const P2 = "p2" as PlayerId;
const U1 = "u1" as UnitId;
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

describe("determinism-harness", () => {
  it("same seed and commands replay to the same hash", () => {
    const commands: Command[] = [
      { kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey] },
      { kind: "EndTurn", playerId: P1 },
    ];
    const run1 = replay(makeBaseState, commands);
    const run2 = replay(makeBaseState, commands);
    expect(run1.hash).toBe(run2.hash);
  });

  it("different command logs produce different hashes", () => {
    const cmds1: Command[] = [
      { kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey] },
    ];
    const cmds2: Command[] = [
      { kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey, "2,0" as HexKey] },
    ];
    const run1 = replay(makeBaseState, cmds1);
    const run2 = replay(makeBaseState, cmds2);
    expect(run1.hash).not.toBe(run2.hash);
  });

  it("accepts a deterministic multi-command log", () => {
    const commands: Command[] = [
      { kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey] },
      { kind: "EndTurn", playerId: P1 },
      { kind: "EndTurn", playerId: P2 },
      { kind: "MoveUnit", playerId: P1, unitId: U1, path: ["2,0" as HexKey] },
    ];
    expect(() => assertDeterministic(makeBaseState, commands)).not.toThrow();
  });

  it("names the diverging command index", () => {
    let counter = 0;
    const factory = (): GameState => {
      const s = makeBaseState();
      s.nextEntitySeq = counter++;
      return s;
    };
    const commands: Command[] = [
      { kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey] },
      { kind: "EndTurn", playerId: P1 },
    ];
    expect(() => assertDeterministic(factory, commands)).toThrow(/command index 0/);
  });

  it("assertDeterministic throws on a non-deterministic factory", () => {
    let counter = 0;
    const nonDetFactory = (): GameState => {
      counter++;
      const s = makeBaseState();
      s.nextEntitySeq = counter;
      return s;
    };
    const commands: Command[] = [
      { kind: "MoveUnit", playerId: P1, unitId: U1, path: ["1,0" as HexKey] },
    ];
    expect(() => assertDeterministic(nonDetFactory, commands)).toThrow(/Determinism violated/);
  });
});
