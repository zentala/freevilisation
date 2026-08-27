import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { normalizeStartPositions } from "./start-positions-normalize.js";
import { TERRAIN_QUALITY } from "./start-positions.js";
import { TERRAIN } from "./climate.js";
import { flatWrap } from "./start-positions.test-fixtures.js";
import type { ClimateResult } from "./climate.js";
import type { ResourcesResult } from "./resources.js";
import type { LandmassResult } from "./landmass.js";

/** A 3x3 all-land, all-desert map with no resources — a deliberately poor draw. */
function buildDesertMap(): { landmass: LandmassResult; climate: ClimateResult; resources: ResourcesResult } {
  const width = 3;
  const height = 3;
  const size = width * height;
  return {
    landmass: { width, height, elevation: new Array(size).fill(1), isLand: new Array(size).fill(true) },
    climate: { terrainDefId: new Array(size).fill(TERRAIN.desert) },
    resources: { resourceDefId: new Array(size).fill(null) },
  };
}

/** Center tile of the 3x3 map — every one of its 6 neighbours is in bounds. */
const CENTER = { q: 1, r: 1 };

function countGoodNeighbours(climate: ClimateResult): number {
  const width = 3;
  let good = 0;
  for (let idx = 0; idx < 9; idx++) {
    if (idx === CENTER.r * width + CENTER.q) continue;
    if ((TERRAIN_QUALITY[climate.terrainDefId[idx]!] ?? 0) >= 2) good++;
  }
  return good;
}

function countResourceNeighbours(resources: ResourcesResult): number {
  return resources.resourceDefId.filter((r) => r !== null).length;
}

describe("normalizeStartPositions", () => {
  it("upgrades an all-desert start to clear the quality and resource floor", () => {
    const { landmass, climate, resources } = buildDesertMap();
    const wrap = flatWrap(3);

    expect(countGoodNeighbours(climate)).toBe(0);
    expect(countResourceNeighbours(resources)).toBe(0);

    normalizeStartPositions([CENTER], landmass, climate, resources, wrap, createPrng(1).fork("test"));

    expect(countGoodNeighbours(climate)).toBeGreaterThanOrEqual(2);
    expect(countResourceNeighbours(resources)).toBeGreaterThanOrEqual(1);
  });

  it("is deterministic: the same seed produces byte-identical normalized output", () => {
    const run = () => {
      const { landmass, climate, resources } = buildDesertMap();
      normalizeStartPositions(
        [CENTER],
        landmass,
        climate,
        resources,
        flatWrap(3),
        createPrng(42).fork("normalize"),
      );
      return { terrainDefId: climate.terrainDefId, resourceDefId: resources.resourceDefId };
    };

    expect(run()).toEqual(run());
  });

  it("leaves an already-fit start untouched", () => {
    const width = 3;
    const height = 3;
    const size = width * height;
    const terrainDefId = new Array(size).fill(TERRAIN.grassland);
    const resourceDefId = new Array(size).fill(null);
    resourceDefId[5] = "resource_wheat"; // neighbour of CENTER (q=1, r=1)
    const landmass: LandmassResult = { width, height, elevation: new Array(size).fill(1), isLand: new Array(size).fill(true) };
    const climate: ClimateResult = { terrainDefId };
    const resources: ResourcesResult = { resourceDefId };
    const before = { terrainDefId: [...terrainDefId], resourceDefId: [...resourceDefId] };

    normalizeStartPositions([CENTER], landmass, climate, resources, flatWrap(3), createPrng(1).fork("test"));

    expect(climate.terrainDefId).toEqual(before.terrainDefId);
    expect(resources.resourceDefId).toEqual(before.resourceDefId);
  });
});
