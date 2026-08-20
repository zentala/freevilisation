import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateClimate, TERRAIN } from "./climate.js";
import { generateLandmass } from "./landmass.js";
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
    let checked = 0;
    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const idx = r * width + q;
        if (climate.terrainDefId[idx] !== TERRAIN.coast) continue;
        const deltas: readonly [number, number][] = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
        let hasLandNeighbor = false;
        for (const [dq, dr] of deltas) {
          const nq = q + dq;
          const nr = r + dr;
          if (
            nq >= 0 &&
            nq < width &&
            nr >= 0 &&
            nr < height &&
            landmass.isLand[nr * width + nq]!
          ) {
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
});
