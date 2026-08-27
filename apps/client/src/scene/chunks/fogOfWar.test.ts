import type { TerrainDefId } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import {
  buildTerrainBatches,
  VisibilityState,
  visibilityTint,
  visibleTerrainTiles,
} from "./TerrainChunks";

const terrain = "terrain_grassland" as TerrainDefId;

describe("terrain fog of war", () => {
  it("does not build instances for unexplored tiles", () => {
    const tiles = [
      { coord: { q: 0, r: 0 }, terrainDefId: terrain, visibility: VisibilityState.Unexplored },
      { coord: { q: 1, r: 0 }, terrainDefId: terrain, visibility: VisibilityState.Visible },
    ];

    expect(visibleTerrainTiles(tiles)).toHaveLength(1);
    expect(buildTerrainBatches(tiles)[0]?.tiles).toEqual([tiles[1]]);
  });

  it("uses a darker tint for explored tiles", () => {
    const visible = visibilityTint(VisibilityState.Visible);
    const explored = visibilityTint(VisibilityState.Explored);

    expect(explored.r).toBeLessThan(visible.r);
    expect(explored.r).toBeCloseTo(0.35);
    expect(explored.g).toBeCloseTo(0.35);
    expect(explored.b).toBeCloseTo(0.35);
  });

  it("defaults tiles without visibility to currently visible", () => {
    expect(visibleTerrainTiles([{ coord: { q: 0, r: 0 }, terrainDefId: terrain }])).toHaveLength(1);
  });
});
