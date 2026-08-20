import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateFeatures, FEATURE } from "./features.js";
import { generateLandmass } from "./landmass.js";
import { generateClimate } from "./climate.js";
import type { MapGenParams } from "../pipeline.js";

const FEATURE_IDS = Object.values(FEATURE);

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

function runFeatures(params: MapGenParams) {
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
  const featuresPrng = createPrng(params.seed).fork("features");
  const features = generateFeatures(params, climate, {
    prng: featuresPrng,
    onProgress: () => {},
  });
  return { landmass, climate, features };
}

describe("generateFeatures", () => {
  it("determinism: same seed produces byte-identical featureDefId", () => {
    const params = makeParams();
    const r1 = runFeatures(params);
    const r2 = runFeatures(params);
    expect(r1.features.featureDefId).toEqual(r2.features.featureDefId);
  });

  it("featureDefId array length matches width * height", () => {
    const params = makeParams({ mapSize: "tiny" });
    const { landmass, features } = runFeatures(params);
    expect(features.featureDefId.length).toBe(landmass.width * landmass.height);
  });

  it("every ocean tile (isLand=false) gets null", () => {
    const params = makeParams();
    const { landmass, features } = runFeatures(params);
    for (let i = 0; i < landmass.isLand.length; i++) {
      if (!landmass.isLand[i]) {
        expect(features.featureDefId[i]).toBeNull();
      }
    }
  });

  it("every non-null featureDefId is one of the four feature ids", () => {
    const params = makeParams();
    const { features } = runFeatures(params);
    for (const f of features.featureDefId) {
      if (f !== null) {
        expect(FEATURE_IDS).toContain(f);
      }
    }
  });

  it("every non-null featureDefId is on a terrain valid for that feature", () => {
    const params = makeParams();
    const { landmass, climate, features } = runFeatures(params);
    for (let i = 0; i < landmass.isLand.length; i++) {
      if (features.featureDefId[i] !== null) {
        const terrain = climate.terrainDefId[i];
        const validTerrains: Record<string, string[]> = {
          "terrain_plains": ["forest", "marsh"],
          "terrain_tundra": ["forest"],
          "terrain_grassland": ["jungle", "marsh"],
          "terrain_snow": ["ice"],
          "terrain_coast": ["ice"],
        };
        const featureName = Object.entries(FEATURE).find(
          ([, fid]) => fid === features.featureDefId[i]
        )?.[0];
        if (featureName && terrain) {
          expect(validTerrains[terrain]!.includes(featureName)).toBe(true);
        }
      }
    }
  });

  it("at least one standard-size map at a fixed seed produces non-null entries", () => {
    const params = makeParams({ seed: 42, mapSize: "standard" });
    const { features } = runFeatures(params);
    const nonNull = features.featureDefId.filter((f) => f !== null);
    expect(nonNull.length).toBeGreaterThan(0);
  });

  it("no feature appears on desert terrain", () => {
    const params = makeParams();
    const { climate, features } = runFeatures(params);
    for (let i = 0; i < climate.terrainDefId.length; i++) {
      if (climate.terrainDefId[i] === "terrain_desert") {
        expect(features.featureDefId[i]).toBeNull();
      }
    }
  });
});