import { describe, it, expect } from "vitest";
import type { AxialCoord } from "./coords.js";
import type { EntityId, TerrainDefId } from "../ids.js";
import { toHexKey, coordsEqual } from "./coords.js";
import { Tile } from "../entities/Tile.js";
import { buildGameMap } from "./game-map.js";
import { neighborsOf } from "./graph.js";

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

describe("game-map + graph integration", () => {
  describe("wraparound east edge", () => {
    const map = buildGameMap(5, 5, true, makeTile);

    it("includes the wrapped west-edge neighbour {q:0,r:2}", () => {
      const result = neighborsOf({ q: 4, r: 2 }, map, allPassable);
      const wrapped = result.find((c) => c.q === 0 && c.r === 2);
      expect(wrapped).toBeDefined();
    });

    it("does not include any coordinate with q outside [0,5)", () => {
      const result = neighborsOf({ q: 4, r: 2 }, map, allPassable);
      for (const c of result) {
        expect(c.q).toBeGreaterThanOrEqual(0);
        expect(c.q).toBeLessThan(5);
      }
    });
  });

  describe("no-wrap east edge", () => {
    const map = buildGameMap(5, 5, false, makeTile);

    it("does not include {q:0,r:2} as neighbour of {q:4,r:2}", () => {
      const result = neighborsOf({ q: 4, r: 2 }, map, allPassable);
      const hasWrapped = result.some((c) => c.q === 0 && c.r === 2);
      expect(hasWrapped).toBe(false);
    });
  });

  describe("selective passability", () => {
    const map = buildGameMap(5, 5, true, makeTile);
    const blockedCoord: AxialCoord = { q: 2, r: 2 };

    const isPassable = (tile: Tile): boolean => {
      return tile.hexKey !== toHexKey(blockedCoord);
    };

    it("neighboursOf({q:1,r:2}) does not include {q:2,r:2}", () => {
      const result = neighborsOf({ q: 1, r: 2 }, map, isPassable);
      const hasBlocked = result.some((c) => coordsEqual(c, blockedCoord));
      expect(hasBlocked).toBe(false);
    });

    it("neighboursOf({q:1,r:2}) still includes other reachable neighbours", () => {
      const allResult = neighborsOf({ q: 1, r: 2 }, map, allPassable);
      const filtered = neighborsOf({ q: 1, r: 2 }, map, isPassable);

      const expected = allResult.filter((c) => !coordsEqual(c, blockedCoord));
      expect(filtered).toEqual(expected);
    });

    it("neighboursOf({q:2,r:1}) does not include {q:2,r:2}", () => {
      const result = neighborsOf({ q: 2, r: 1 }, map, isPassable);
      const hasBlocked = result.some((c) => coordsEqual(c, blockedCoord));
      expect(hasBlocked).toBe(false);
    });

    it("neighboursOf({q:3,r:2}) does not include {q:2,r:2}", () => {
      const result = neighborsOf({ q: 3, r: 2 }, map, isPassable);
      const hasBlocked = result.some((c) => coordsEqual(c, blockedCoord));
      expect(hasBlocked).toBe(false);
    });
  });
});
