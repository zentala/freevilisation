import type { TerrainDefId } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import { axialToWorld } from "../hexMath";
import { buildTerrainBatches } from "./TerrainChunks";

const terrain = (value: string) => value as TerrainDefId;

describe("buildTerrainBatches", () => {
  it("creates one batch per terrain and chunk pair", () => {
    const batches = buildTerrainBatches([
      { coord: { q: 0, r: 0 }, terrainDefId: terrain("terrain_grassland") },
      { coord: { q: 1, r: 0 }, terrainDefId: terrain("terrain_grassland") },
      { coord: { q: 0, r: 16 }, terrainDefId: terrain("terrain_grassland") },
      { coord: { q: 0, r: 0 }, terrainDefId: terrain("terrain_desert") },
    ]);

    expect(batches.map((batch) => batch.key)).toEqual([
      "0,0:terrain_grassland",
      "0,1:terrain_grassland",
      "0,0:terrain_desert",
    ]);
    expect(batches[0]!.tiles).toHaveLength(2);
    expect(batches[1]!.tiles).toHaveLength(1);
  });

  it("retains tile order so matrix instances are deterministic", () => {
    const tiles = [
      { coord: { q: -1, r: 2 }, terrainDefId: terrain("terrain_tundra") },
      { coord: { q: 3, r: -2 }, terrainDefId: terrain("terrain_tundra") },
    ];
    const batch = buildTerrainBatches(tiles)[0]!;

    expect(batch.tiles).toEqual(tiles);
    expect(axialToWorld(batch.tiles[1]!.coord).toArray()).toEqual([Math.sqrt(3) * 2, 0, -3]);
  });
});
