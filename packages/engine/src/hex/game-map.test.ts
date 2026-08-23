import { describe, it, expect } from "vitest";
import type { AxialCoord } from "./coords.js";
import type { EntityId, TerrainDefId, HexKey } from "../ids.js";
import { toHexKey, fromHexKey } from "./coords.js";
import { Tile } from "../entities/Tile.js";
import { buildGameMap, getTile, hasTile, toWrapContext } from "./game-map.js";

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
    false,
    false,
    null,
    null,
    null,
    [],
  );
}

function makeTileAt(coord: AxialCoord): Tile {
  return makeTile(coord);
}

describe("buildGameMap", () => {
  it("produces tiles with exactly width*height keys for 5×5", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    expect(Object.keys(map.tiles).length).toBe(25);
  });

  it("every key round-trips to a coordinate in [0,5)×[0,5)", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    for (const key of Object.keys(map.tiles)) {
      const coord = fromHexKey(key as HexKey);
      expect(coord.q).toBeGreaterThanOrEqual(0);
      expect(coord.q).toBeLessThan(5);
      expect(coord.r).toBeGreaterThanOrEqual(0);
      expect(coord.r).toBeLessThan(5);
    }
  });

  it("tile factory is called exactly 25 times for 5×5", () => {
    let count = 0;
    const factory = (_coord: AxialCoord) => {
      count++;
      return makeTile(_coord);
    };
    buildGameMap(5, 5, false, factory);
    expect(count).toBe(25);
  });

  it("factory is called in r-ascending, q-ascending order", () => {
    const recorded: AxialCoord[] = [];
    const factory = (coord: AxialCoord) => {
      recorded.push(coord);
      return makeTile(coord);
    };
    buildGameMap(5, 5, false, factory);

    expect(recorded[0]).toEqual({ q: 0, r: 0 });
    expect(recorded[1]).toEqual({ q: 1, r: 0 });
    expect(recorded[4]).toEqual({ q: 4, r: 0 });
    expect(recorded[5]).toEqual({ q: 0, r: 1 });
    expect(recorded[24]).toEqual({ q: 4, r: 4 });
  });

  it("sets width, height, isWraparoundX correctly", () => {
    const map = buildGameMap(10, 20, true, makeTileAt);
    expect(map.width).toBe(10);
    expect(map.height).toBe(20);
    expect(map.isWraparoundX).toBe(true);
  });
});

describe("getTile", () => {
  it("returns the exact Tile instance for an in-range coordinate", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    const coord: AxialCoord = { q: 2, r: 3 };
    const tile = getTile(map, coord);
    expect(tile).toBe(map.tiles[toHexKey(coord)]);
  });

  it("returns undefined for out-of-range coordinate {q:5, r:0}", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    expect(getTile(map, { q: 5, r: 0 })).toBeUndefined();
  });

  it("returns undefined for negative coordinate {q:-1, r:0}", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    expect(getTile(map, { q: -1, r: 0 })).toBeUndefined();
  });
});

describe("hasTile", () => {
  it("returns true for an in-range coordinate", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    expect(hasTile(map, { q: 2, r: 3 })).toBe(true);
  });

  it("returns false for out-of-range coordinate {q:5, r:0}", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    expect(hasTile(map, { q: 5, r: 0 })).toBe(false);
  });

  it("returns false for negative coordinate {q:-1, r:0}", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    expect(hasTile(map, { q: -1, r: 0 })).toBe(false);
  });

  it("agrees with getTile on both in-range and out-of-range", () => {
    const map = buildGameMap(5, 5, false, makeTileAt);
    const coords: AxialCoord[] = [
      { q: 0, r: 0 },
      { q: 4, r: 4 },
      { q: 5, r: 0 },
      { q: -1, r: 0 },
    ];
    for (const c of coords) {
      expect(hasTile(map, c)).toBe(getTile(map, c) !== undefined);
    }
  });
});

describe("toWrapContext", () => {
  it("returns correct WrapContext for wraparound map", () => {
    const map = buildGameMap(20, 10, true, makeTileAt);
    const ctx = toWrapContext(map);
    expect(ctx).toEqual({ isWraparoundX: true, width: 20 });
  });

  it("returns correct WrapContext for non-wraparound map", () => {
    const map = buildGameMap(20, 10, false, makeTileAt);
    const ctx = toWrapContext(map);
    expect(ctx).toEqual({ isWraparoundX: false, width: 20 });
  });
});

describe("buildGameMap edge cases", () => {
  it("throws on width 0", () => {
    expect(() => buildGameMap(0, 5, false, makeTileAt)).toThrow(
      "buildGameMap width must be positive",
    );
  });

  it("throws on height 0", () => {
    expect(() => buildGameMap(5, 0, false, makeTileAt)).toThrow(
      "buildGameMap height must be positive",
    );
  });

  it("throws on negative width", () => {
    expect(() => buildGameMap(-1, 5, false, makeTileAt)).toThrow(
      "buildGameMap width must be positive",
    );
  });

  it("throws on negative height", () => {
    expect(() => buildGameMap(5, -1, false, makeTileAt)).toThrow(
      "buildGameMap height must be positive",
    );
  });
});
