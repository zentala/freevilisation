import type { GameState } from "../game-state.js";
import type { PlayerId, UnitId, HexKey } from "../ids.js";
import type { TerrainDefId, UnitDefId, CivDefId, DefId } from "../ids.js";
import { makeEntityId } from "../ids.js";
import { Player } from "../entities/Player.js";
import { Unit } from "../entities/Unit.js";
import { Tile } from "../entities/Tile.js";

export const P1 = "p1" as PlayerId;
export const P2 = "p2" as PlayerId;
export const U1 = "u1" as UnitId;
export const U2 = "u2" as UnitId;
export const TERRAIN = "terrain_grassland" as TerrainDefId;
export const WARRIOR = "unit_warrior" as UnitDefId;
export const ROME = "civ_rome" as CivDefId;
export const EGYPT = "civ_egypt" as CivDefId;

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

/** A 3x3 hex map with two warrior units, one per player, ready for command tests. */
export function makeBaseState(): GameState {
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
