import { describe, expect, it } from "vitest";
import { createPrng, type TerrainDefId, type WrapContext } from "@freevilisation/engine";
import type { LandmassResult } from "./landmass.js";
import { removeTinyIslands } from "./tiny-islands.js";
import { generateWater, TERRAIN_LAKE } from "./water.js";
import { TERRAIN } from "./climate.js";

const FLAT_WRAP: WrapContext = { isWraparoundX: false, width: 6 };

function landmass(landIndices: readonly number[]): LandmassResult {
  const isLand = new Array<boolean>(36).fill(false);
  for (const idx of landIndices) isLand[idx] = true;
  return { width: 6, height: 6, elevation: new Array<number>(36).fill(0.5), isLand };
}

describe("removeTinyIslands", () => {
  it("removes components smaller than three tiles before terrain classification", () => {
    const mainland = [0, 1, 6, 7];
    const result = removeTinyIslands(landmass([...mainland, 28, 29]), FLAT_WRAP);

    expect(result.isLand.filter(Boolean)).toHaveLength(mainland.length);
    for (const idx of mainland) expect(result.isLand[idx]).toBe(true);
    expect(result.isLand[28]).toBe(false);
    expect(result.isLand[29]).toBe(false);
  });

  it("returns the original object when no repair is needed", () => {
    const input = landmass([0, 1, 6]);
    expect(removeTinyIslands(input, FLAT_WRAP)).toBe(input);
  });

  it("lets water classify a removed island as part of its surrounding lake", () => {
    const width = 7;
    const isLand = new Array<boolean>(49).fill(true);
    for (let r = 2; r <= 4; r++) {
      for (let q = 2; q <= 4; q++) isLand[r * width + q] = false;
    }
    const islandIndex = 3 * width + 3;
    isLand[islandIndex] = true;
    const input = { width, height: 7, elevation: new Array<number>(49).fill(0.5), isLand };
    const repaired = removeTinyIslands(input, { isWraparoundX: true, width });
    const climate = {
      terrainDefId: new Array<TerrainDefId>(49).fill(TERRAIN.grassland),
    };

    const water = generateWater(
      { seed: 1, mapType: "continents", mapSize: "tiny" },
      repaired,
      climate,
      { prng: createPrng(1), onProgress: () => {} },
    );

    expect(repaired.isLand[islandIndex]).toBe(false);
    expect(water.terrainDefId[islandIndex]).toBe(TERRAIN_LAKE);
  });
});
