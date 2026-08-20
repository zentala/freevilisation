import { describe, it, expect } from "vitest";
import type { AxialCoord } from "./coords.js";
import type { ChunkKey } from "../ids.js";
import { coordsEqual, toHexKey } from "./coords.js";
import {
  CHUNK_SIZE,
  toChunkKey,
  fromChunkKey,
  chunkTiles,
  chunksInRadius,
} from "./chunk.js";

describe("chunk", () => {
  describe("toChunkKey / fromChunkKey", () => {
    const cases: AxialCoord[] = [
      { q: 0, r: 0 },
      { q: 15, r: 15 },
      { q: 16, r: 0 },
      { q: -1, r: 0 },
      { q: -16, r: -16 },
      { q: -17, r: 1 },
      { q: 100, r: -50 },
    ];

    it("round trips through chunkTiles", () => {
      for (const c of cases) {
        const key = toChunkKey(c);
        const tiles = chunkTiles(key);
        expect(tiles.some((t) => coordsEqual(t, c))).toBe(true);
      }
    });

    it("fromChunkKey throws on bad keys", () => {
      expect(() => fromChunkKey("abc" as unknown as ChunkKey)).toThrow("Malformed ChunkKey");
      expect(() => fromChunkKey("1" as unknown as ChunkKey)).toThrow("Malformed ChunkKey");
      expect(() => fromChunkKey("1,2,3" as unknown as ChunkKey)).toThrow("Malformed ChunkKey");
      expect(() => fromChunkKey("1.5,2" as unknown as ChunkKey)).toThrow("Malformed ChunkKey");
    });
  });

  describe("chunkTiles", () => {
    it("returns exactly CHUNK_SIZE² tiles", () => {
      const tiles = chunkTiles(toChunkKey({ q: 0, r: 0 }));
      expect(tiles.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
    });

    it("has no duplicate hex keys", () => {
      const tiles = chunkTiles(toChunkKey({ q: 0, r: 0 }));
      const keys = new Set(tiles.map(toHexKey));
      expect(keys.size).toBe(tiles.length);
    });

    it("every tile maps back to the chunk key", () => {
      const key = toChunkKey({ q: 30, r: -10 });
      const tiles = chunkTiles(key);
      for (const t of tiles) {
        expect(toChunkKey(t)).toBe(key);
      }
    });

    it("returns tiles in row-major order (origin chunk)", () => {
      const tiles = chunkTiles(toChunkKey({ q: 0, r: 0 }));
      expect(tiles[0]).toEqual({ q: 0, r: 0 });
      expect(tiles[1]).toEqual({ q: 1, r: 0 });
      expect(tiles[15]).toEqual({ q: 15, r: 0 });
      expect(tiles[16]).toEqual({ q: 0, r: 1 });
      expect(tiles[255]).toEqual({ q: 15, r: 15 });
    });

    it("returns tiles in row-major order (negative chunk)", () => {
      const tiles = chunkTiles(toChunkKey({ q: -16, r: 0 }));
      expect(tiles[0]).toEqual({ q: -16, r: 0 });
      expect(tiles[1]).toEqual({ q: -15, r: 0 });
      expect(tiles[15]).toEqual({ q: -1, r: 0 });
      expect(tiles[16]).toEqual({ q: -16, r: 1 });
      expect(tiles[255]).toEqual({ q: -1, r: 15 });
    });
  });

  describe("chunksInRadius", () => {
    const center: AxialCoord = { q: 0, r: 0 };

    it("radius 0 returns exactly 1 chunk", () => {
      expect(chunksInRadius(center, 0)).toHaveLength(1);
    });

    it("radius 0 returns the exact chunk key", () => {
      expect(chunksInRadius({ q: 30, r: -10 }, 0)).toEqual(["1,-1"]);
    });

    it("radius 1 returns exactly 9 chunks", () => {
      expect(chunksInRadius(center, 1)).toHaveLength(9);
    });

    it("radius 1 returns exact keys in cr-ascending order", () => {
      const result = chunksInRadius({ q: 30, r: -10 }, 1);
      expect(result).toEqual([
        "0,-2", "1,-2", "2,-2",
        "0,-1", "1,-1", "2,-1",
        "0,0", "1,0", "2,0",
      ]);
    });

    it("radius 2 returns exactly 25 chunks", () => {
      expect(chunksInRadius(center, 2)).toHaveLength(25);
    });

    it("no duplicates", () => {
      const keys = chunksInRadius(center, 3);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("throws on negative radius", () => {
      expect(() => chunksInRadius(center, -1)).toThrow("non-negative");
    });
  });
});
