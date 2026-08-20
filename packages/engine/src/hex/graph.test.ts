import { describe, it, expect } from "vitest";
import type { AxialCoord } from "./coords.js";
import type { EntityId, TerrainDefId } from "../ids.js";
import { toHexKey, coordsEqual } from "./coords.js";
import { AXIAL_DIRECTIONS, distance } from "./hex-math.js";
import { Tile } from "../entities/Tile.js";
import { buildGameMap, hasTile } from "./game-map.js";
import { neighborsOf, edgeCost } from "./graph.js";

function makeTile(coord: AxialCoord): Tile {
  return new Tile(
    "tile_0" as EntityId,
    0,
    toHexKey(coord),
    "grass" as TerrainDefId,
    null,
    null,
    null,
    false,
    null,
    null,
    null,
    [],
  );
}

const allPassable = () => true;

describe("neighborsOf", () => {
  const map = buildGameMap(5, 5, false, makeTile);

  it("returns 6 neighbours for center tile (2,2)", () => {
    const result = neighborsOf({ q: 2, r: 2 }, map, allPassable);
    expect(result).toHaveLength(6);
  });

  it("returns neighbours in AXIAL_DIRECTIONS order", () => {
    const center: AxialCoord = { q: 2, r: 2 };
    const result = neighborsOf(center, map, allPassable);
    const expected = AXIAL_DIRECTIONS.map((d) => ({
      q: center.q + d.q,
      r: center.r + d.r,
    }));
    expect(result).toEqual(expected);
  });

  it("returns fewer than 6 for corner tile (0,0)", () => {
    const result = neighborsOf({ q: 0, r: 0 }, map, allPassable);
    expect(result.length).toBeLessThan(6);
  });

  it("every returned coordinate has a tile", () => {
    const result = neighborsOf({ q: 0, r: 0 }, map, allPassable);
    for (const c of result) {
      expect(hasTile(map, c)).toBe(true);
    }
  });

  it("removes exactly the blocked tile from neighbours", () => {
    const center: AxialCoord = { q: 1, r: 2 };
    const allResult = neighborsOf(center, map, allPassable);
    const blockedCoord: AxialCoord = { q: 2, r: 2 };
    const isPassable = (tile: Tile) => tile.hexKey !== toHexKey(blockedCoord);
    const filtered = neighborsOf(center, map, isPassable);

    expect(filtered).toHaveLength(allResult.length - 1);
    const expected = allResult.filter(
      (c) => !coordsEqual(c, blockedCoord),
    );
    expect(filtered).toEqual(expected);
  });

  it("returns empty array for coordinate off the map", () => {
    const result = neighborsOf({ q: 10, r: 10 }, map, allPassable);
    expect(result).toEqual([]);
  });
});

describe("edgeCost", () => {
  it("returns distance for adjacent coordinates", () => {
    const a: AxialCoord = { q: 0, r: 0 };
    const b: AxialCoord = { q: 1, r: 0 };
    const cost = edgeCost(a, b, (x, y) => distance(x, y));
    expect(cost).toBe(1);
  });

  it("passes through the cost function directly", () => {
    const a: AxialCoord = { q: 2, r: 1 };
    const b: AxialCoord = { q: 3, r: 1 };
    const cost = edgeCost(a, b, () => 42);
    expect(cost).toBe(42);
  });
});
