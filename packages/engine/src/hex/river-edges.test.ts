import { describe, it, expect } from "vitest";
import type { AxialCoord } from "./coords.js";
import type { EntityId, TerrainDefId } from "../ids.js";
import { toHexKey } from "./coords.js";
import { Tile } from "../entities/Tile.js";
import { buildGameMap } from "./game-map.js";
import { hasRiverEdge } from "./river-edges.js";

let nextId = 0;

function makeTile(
  coord: AxialCoord,
  riverEdge0: boolean,
  riverEdge1: boolean,
  riverEdge2: boolean,
): Tile {
  return new Tile(
    `tile_${nextId++}` as EntityId,
    0,
    toHexKey(coord),
    "grass" as TerrainDefId,
    null,
    null,
    null,
    riverEdge0,
    riverEdge1,
    riverEdge2,
    null,
    null,
    null,
    [],
  );
}

describe("hasRiverEdge", () => {
  it("reads an owned edge (direction 0..2) directly off the tile", () => {
    const map = buildGameMap(3, 3, false, (c) => makeTile(c, true, false, true));
    expect(hasRiverEdge(map, { q: 1, r: 1 }, 0)).toBe(true);
    expect(hasRiverEdge(map, { q: 1, r: 1 }, 1)).toBe(false);
    expect(hasRiverEdge(map, { q: 1, r: 1 }, 2)).toBe(true);
  });

  it("resolves an unowned edge (direction 3..5) off the neighbour", () => {
    // Tile (1,1) does not own direction 3 (west); its neighbour in that
    // direction, (0,1), owns the opposite edge at its own index 3-3=0.
    const map = buildGameMap(3, 3, false, (c) => makeTile(c, c.q === 0 && c.r === 1, false, false));
    expect(hasRiverEdge(map, { q: 1, r: 1 }, 3)).toBe(true);
  });

  it("returns false for a coordinate whose owning tile is off the map", () => {
    const map = buildGameMap(3, 3, false, (c) => makeTile(c, false, false, false));
    // North hard edge: direction 2 at r=0 has no owner above the map.
    expect(hasRiverEdge(map, { q: 1, r: 0 }, 2)).toBe(false);
  });

  it("wraps east-west: column 0's western edge is owned by the last column", () => {
    const width = 4;
    const map = buildGameMap(width, 3, true, (c) =>
      makeTile(c, c.q === width - 1 && c.r === 1, false, false),
    );
    // Tile (0, 1)'s neighbour in direction 3 (west) wraps to (width-1, 1),
    // which owns the opposite edge at its own index 3-3=0.
    expect(hasRiverEdge(map, { q: 0, r: 1 }, 3)).toBe(true);
  });

  it("throws on an out-of-range direction", () => {
    const map = buildGameMap(2, 2, false, (c) => makeTile(c, false, false, false));
    expect(() => hasRiverEdge(map, { q: 0, r: 0 }, 6)).toThrow();
    expect(() => hasRiverEdge(map, { q: 0, r: 0 }, -1)).toThrow();
  });
});
