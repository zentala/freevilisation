import type { AxialCoord, ChunkKey } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import { boundsForChunk, ChunkRegistry } from "./ChunkRegistry";

describe("ChunkRegistry", () => {
  it("computes inclusive 16-tile bounds", () => {
    expect(boundsForChunk("-1,2" as ChunkKey)).toEqual({
      minQ: -16,
      maxQ: -1,
      minR: 32,
      maxR: 47,
    });
  });

  it("creates one deterministic chunk for coordinates", () => {
    const registry = new ChunkRegistry();
    const first = registry.ensure({ q: -1, r: 16 });
    const second = registry.ensure({ q: -1, r: 16 });

    expect(first).toBe(second);
    expect(first.tiles).toHaveLength(256);
    expect(registry.size).toBe(1);
  });

  it("tracks dirty state without rebuilding the chunk", () => {
    const registry = new ChunkRegistry();
    const coord: AxialCoord = { q: 0, r: 0 };
    const chunk = registry.ensure(coord);
    registry.markClean(chunk.key);
    expect(registry.get(chunk.key)?.dirty).toBe(false);
    registry.markDirty(coord);
    expect(registry.get(chunk.key)?.dirty).toBe(true);
  });
});
