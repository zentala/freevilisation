import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateRivers } from "./rivers.js";
import { generateLandmass } from "./landmass.js";
import type { MapGenParams } from "../pipeline.js";

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

function runRivers(params: MapGenParams) {
  const landmassPrng = createPrng(params.seed).fork("landmass");
  const landmass = generateLandmass(params, {
    prng: landmassPrng,
    onProgress: () => {},
  });
  const riversPrng = createPrng(params.seed).fork("rivers");
  const rivers = generateRivers(params, landmass, {
    prng: riversPrng,
    onProgress: () => {},
  });
  return { landmass, rivers };
}

describe("generateRivers", () => {
  it("determinism: same seed produces byte-identical hasRiver", () => {
    const params = makeParams();
    const r1 = runRivers(params);
    const r2 = runRivers(params);
    expect(r1.rivers.hasRiver).toEqual(r2.rivers.hasRiver);
  });

  it("hasRiver array length matches width * height", () => {
    const params = makeParams({ mapSize: "tiny" });
    const { landmass, rivers } = runRivers(params);
    expect(rivers.hasRiver.length).toBe(landmass.width * landmass.height);
  });

  it("every river tile is land (hasRiver[i] === true implies isLand[i] === true)", () => {
    const params = makeParams();
    const { landmass, rivers } = runRivers(params);
    for (let i = 0; i < rivers.hasRiver.length; i++) {
      if (rivers.hasRiver[i]) {
        expect(landmass.isLand[i]).toBe(true);
      }
    }
  });

  it("standard-size map at fixed seed produces at least one river", () => {
    const params = makeParams({ seed: 42, mapSize: "standard" });
    const { rivers } = runRivers(params);
    const hasAnyRiver = rivers.hasRiver.some(Boolean);
    expect(hasAnyRiver).toBe(true);
  });

  it("bounded-step safety: standard map completes without hanging", () => {
    const params = makeParams({ seed: 42, mapSize: "standard" });
    const { landmass, rivers } = runRivers(params);
    expect(rivers.hasRiver.length).toBe(landmass.width * landmass.height);
  });

  it("tiny map with seed 9999 produces at least one river", () => {
    const params = makeParams({ seed: 9999, mapSize: "tiny" });
    const { rivers } = runRivers(params);
    const hasAnyRiver = rivers.hasRiver.some(Boolean);
    expect(hasAnyRiver).toBe(true);
  });
});
