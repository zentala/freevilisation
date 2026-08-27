import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateLandmass } from "./landmass.js";
import { MAP_SIZES, MAP_TYPE_PRESETS } from "../config.js";
import type { MapGenParams, MapType } from "../pipeline.js";

const MAP_TYPES: readonly MapType[] = ["continents", "pangaea", "archipelago", "islands"];

function makeParams(overrides: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

describe("generateLandmass", () => {
  for (const mapType of MAP_TYPES) {
    it(`tiny ${mapType}: elevation.length === isLand.length === width * height`, () => {
      const params = makeParams({ mapType });
      const prng = createPrng(params.seed).fork("landmass");
      const result = generateLandmass(params, { prng, onProgress: () => {} });
      const { width, height } = MAP_SIZES.tiny!;
      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      expect(result.elevation.length).toBe(width * height);
      expect(result.isLand.length).toBe(width * height);
    });

    it(`tiny ${mapType}: every elevation is in [0, 1)`, () => {
      const params = makeParams({ mapType });
      const prng = createPrng(params.seed).fork("landmass");
      const result = generateLandmass(params, { prng, onProgress: () => {} });
      for (const v of result.elevation) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  }

  const LAND_FRACTION_TOLERANCE = 0.02;

  for (const mapType of MAP_TYPES) {
    it(`${mapType}: land fraction is within ${LAND_FRACTION_TOLERANCE * 100}% of targetLandFraction`, () => {
      const params = makeParams({ mapType, mapSize: "standard" });
      const prng = createPrng(params.seed).fork("landmass");
      const result = generateLandmass(params, { prng, onProgress: () => {} });
      const landCount = result.isLand.filter(Boolean).length;
      const actualFraction = landCount / result.isLand.length;
      const target = MAP_TYPE_PRESETS[mapType]!.targetLandFraction;
      expect(Math.abs(actualFraction - target)).toBeLessThanOrEqual(LAND_FRACTION_TOLERANCE);
    });
  }

  it("land density near the poles is lower than at the equator (latitude bias)", () => {
    const params = makeParams({ mapType: "continents", mapSize: "standard" });
    const prng = createPrng(params.seed).fork("landmass");
    const result = generateLandmass(params, { prng, onProgress: () => {} });
    const { width, height } = MAP_SIZES.standard!;

    const bandDensity = (rows: readonly number[]): number => {
      let land = 0;
      for (const r of rows) {
        for (let q = 0; q < width; q++) {
          if (result.isLand[r * width + q]) land++;
        }
      }
      return land / (rows.length * width);
    };

    const bandSize = 5;
    const poleRows = [
      ...Array.from({ length: bandSize }, (_, i) => i),
      ...Array.from({ length: bandSize }, (_, i) => height - 1 - i),
    ];
    const equator = Math.floor((height - 1) / 2);
    const equatorRows = Array.from(
      { length: bandSize },
      (_, i) => equator - Math.floor(bandSize / 2) + i,
    );

    expect(bandDensity(poleRows)).toBeLessThan(bandDensity(equatorRows));
  });

  it("index convention: width=56 tiny map, tile at q=3,r=2 is at index 115", () => {
    const { width } = MAP_SIZES.tiny!;
    expect(width).toBe(56);
    const idx = 2 * 56 + 3;
    expect(idx).toBe(115);
  });

  it("same params produce deeply-equal elevation and isLand (determinism)", () => {
    const params = makeParams({});
    const prng1 = createPrng(params.seed).fork("landmass");
    const r1 = generateLandmass(params, { prng: prng1, onProgress: () => {} });
    const prng2 = createPrng(params.seed).fork("landmass");
    const r2 = generateLandmass(params, { prng: prng2, onProgress: () => {} });
    expect(r1.elevation).toEqual(r2.elevation);
    expect(r1.isLand).toEqual(r2.isLand);
  });
});
