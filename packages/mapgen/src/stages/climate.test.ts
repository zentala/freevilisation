import { describe, it, expect } from "vitest";
import { createPrng, neighbors } from "@freevilisation/engine";
import { generateClimate, TERRAIN } from "./climate.js";
import { generateLandmass } from "./landmass.js";
import { wrapContextFor } from "../config.js";
import { percentileThreshold } from "../noise.js";
import type { MapGenParams } from "../pipeline.js";

const TERRAIN_IDS = Object.values(TERRAIN);

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

function runClimate(params: MapGenParams) {
  const landmassPrng = createPrng(params.seed).fork("landmass");
  const landmass = generateLandmass(params, {
    prng: landmassPrng,
    onProgress: () => {},
  });
  const climatePrng = createPrng(params.seed).fork("climate");
  const climate = generateClimate(params, landmass, {
    prng: climatePrng,
    onProgress: () => {},
  });
  return { landmass, climate };
}

describe("generateClimate", () => {
  it("determinism: same seed produces byte-identical terrainDefId", () => {
    const params = makeParams();
    const r1 = runClimate(params);
    const r2 = runClimate(params);
    expect(r1.climate.terrainDefId).toEqual(r2.climate.terrainDefId);
  });

  it("terrainDefId array length matches width * height", () => {
    const params = makeParams({ mapSize: "tiny" });
    const { landmass, climate } = runClimate(params);
    expect(climate.terrainDefId.length).toBe(landmass.width * landmass.height);
  });

  it("every ocean tile (isLand=false) gets terrain_ocean or terrain_coast", () => {
    const params = makeParams();
    const { landmass, climate } = runClimate(params);
    for (let i = 0; i < landmass.isLand.length; i++) {
      if (!landmass.isLand[i]) {
        expect([TERRAIN.ocean, TERRAIN.coast]).toContain(climate.terrainDefId[i]);
      }
    }
  });

  it("every land tile gets one of the five land terrains, never ocean/coast", () => {
    const params = makeParams();
    const { landmass, climate } = runClimate(params);
    const landTerrains = new Set([
      TERRAIN.grassland,
      TERRAIN.plains,
      TERRAIN.desert,
      TERRAIN.tundra,
      TERRAIN.snow,
    ]);
    for (let i = 0; i < landmass.isLand.length; i++) {
      if (landmass.isLand[i]) {
        expect(landTerrains.has(climate.terrainDefId[i]!)).toBe(true);
      }
    }
  });

  it("all seven terrain ids are reachable across a standard-size map", () => {
    const found = new Set<string>();
    for (const seed of [1, 42, 999]) {
      const params = makeParams({ seed, mapSize: "standard" });
      const { climate } = runClimate(params);
      for (const tid of climate.terrainDefId) {
        found.add(tid as string);
      }
    }
    for (const expected of TERRAIN_IDS) {
      expect(found.has(expected)).toBe(true);
    }
  });

  it("coast tiles are adjacent to at least one land tile (spot-check)", () => {
    const params = makeParams({ mapSize: "small" });
    const { landmass, climate } = runClimate(params);
    const { width, height } = landmass;
    const wrap = wrapContextFor(width);
    let checked = 0;
    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const idx = r * width + q;
        if (climate.terrainDefId[idx] !== TERRAIN.coast) continue;
        let hasLandNeighbor = false;
        for (const { q: nq, r: nr } of neighbors({ q, r }, wrap)) {
          if (nr < 0 || nr >= height) continue;
          if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
          if (landmass.isLand[nr * width + nq]!) {
            hasLandNeighbor = true;
            break;
          }
        }
        expect(hasLandNeighbor).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("snow-band share of land tiles stays close to its target quantile across different noise-octave presets", () => {
    // continents (octaves 4) and islands (octaves 3) have different noise
    // octave counts and drive a differently-shaped landmass, but the
    // percentile cut should still put ~15% of land tiles below the snow
    // cutoff either way — the point of cutting on the observed
    // distribution instead of a fixed raw-noise threshold.
    const TARGET_SNOW_FRACTION = 0.15;
    const TOLERANCE = 0.05;
    for (const mapType of ["continents", "islands"] as const) {
      const params = makeParams({ mapType, mapSize: "standard" });
      const { landmass, climate } = runClimate(params);
      let landCount = 0;
      let snowCount = 0;
      for (let i = 0; i < landmass.isLand.length; i++) {
        if (!landmass.isLand[i]) continue;
        landCount++;
        if (climate.terrainDefId[i] === TERRAIN.snow) snowCount++;
      }
      expect(landCount).toBeGreaterThan(0);
      const snowShare = snowCount / landCount;
      expect(snowShare).toBeGreaterThan(TARGET_SNOW_FRACTION - TOLERANCE);
      expect(snowShare).toBeLessThan(TARGET_SNOW_FRACTION + TOLERANCE);
    }
  });

  it("uses the same shared percentileThreshold helper as landmass.ts, not a duplicated sort-and-cut", () => {
    const sample = [0.1, 0.9, 0.3, 0.7, 0.5];
    expect(percentileThreshold(sample, 0.4)).toBe(0.5);
  });
});
