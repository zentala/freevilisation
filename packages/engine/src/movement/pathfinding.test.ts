import { describe, expect, it } from "vitest";
import type { EntityId, HexKey, TerrainDefId } from "../ids.js";
import { Tile } from "../entities/Tile.js";
import { buildGameMap } from "../hex/game-map.js";
import { toHexKey } from "../hex/coords.js";
import { createInitialGameState } from "../game-state.js";
import { Registry } from "../registry.js";
import { findPath } from "./pathfinding.js";

function makeState() {
  const registry = Registry.load({ units: [], buildings: [], terrains: [], techs: [], civs: [] });
  const settings = {
    mapSeed: 1,
    mapSize: "tiny" as const,
    victoryConditions: [],
    difficulty: "normal" as never,
    turnTimerSeconds: null,
    simultaneousTurns: false,
  };
  const state = createInitialGameState(1, settings, registry, {
    id: "base",
    version: "1.0.0",
    contentHash: "test",
  });
  state.map = buildGameMap(2, 2, false, (coord) => new Tile(
    "tile_0" as EntityId,
    0,
    toHexKey(coord),
    "grass" as TerrainDefId,
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
  ));
  return state;
}

describe("findPath interface", () => {
  it("returns an empty route when source equals destination", () => {
    const key = "0,0" as HexKey;
    expect(findPath(makeState(), key, key)).toEqual([]);
  });

  it("returns null for distinct points until the search implementation lands", () => {
    expect(findPath(makeState(), "0,0" as HexKey, "1,0" as HexKey)).toBeNull();
  });

  it("returns null for a hex outside the map", () => {
    expect(findPath(makeState(), "0,0" as HexKey, "9,9" as HexKey)).toBeNull();
  });
});
