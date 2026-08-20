import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateStartPositions } from "./start-positions.js";
import { generateLandmass } from "./landmass.js";
import { generateClimate } from "./climate.js";
import { generateResources } from "./resources.js";
import type { MapGenParams } from "../pipeline.js";

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

function runStartPositions(params: MapGenParams) {
  const landmassPrng = createPrng(params.seed).fork("landmass");
  const landmass = generateLandmass(params, { prng: landmassPrng, onProgress: () => {} });
  const climatePrng = createPrng(params.seed).fork("climate");
  const climate = generateClimate(params, landmass, { prng: climatePrng, onProgress: () => {} });
  const resourcesPrng = createPrng(params.seed).fork("resources");
  const resources = generateResources(params, climate, landmass, {
    prng: resourcesPrng,
    onProgress: () => {},
  });
  const startPositionsPrng = createPrng(params.seed).fork("start-positions");
  const startPositions = generateStartPositions(params, landmass, climate, resources, {
    prng: startPositionsPrng,
    onProgress: () => {},
  });
  return { landmass, climate, resources, startPositions };
}

describe("generateStartPositions", () => {
  it("determinism: same seed and params produce byte-identical startPositions", () => {
    const params = makeParams({ numPlayers: 4 });
    const r1 = runStartPositions(params);
    const r2 = runStartPositions(params);
    expect(r1.startPositions.startPositions).toEqual(r2.startPositions.startPositions);
  });

  it.each([2, 4, 8])("returns numPlayers=%i positions on a standard map", (numPlayers) => {
    const params = makeParams({ mapSize: "standard", numPlayers });
    const { startPositions } = runStartPositions(params);
    expect(startPositions.startPositions.length).toBe(numPlayers);
  });

  it("every returned position lands on a land tile", () => {
    const params = makeParams({ mapSize: "standard", numPlayers: 6 });
    const { landmass, startPositions } = runStartPositions(params);
    for (const { q, r } of startPositions.startPositions) {
      expect(landmass.isLand[r * landmass.width + q]).toBe(true);
    }
  });

  it("no two returned positions are identical", () => {
    const params = makeParams({ mapSize: "standard", numPlayers: 8 });
    const { startPositions } = runStartPositions(params);
    const seen = new Set<string>();
    for (const { q, r } of startPositions.startPositions) {
      const key = `${q},${r}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("never throws and always returns the requested count on a tiny map with a high player count", () => {
    const params = makeParams({ mapSize: "tiny", numPlayers: 8 });
    expect(() => runStartPositions(params)).not.toThrow();
    const { startPositions } = runStartPositions(params);
    expect(startPositions.startPositions.length).toBe(8);
  });

  it("omitting numPlayers defaults to 4", () => {
    const params = makeParams();
    const { startPositions } = runStartPositions(params);
    expect(startPositions.startPositions.length).toBe(4);
  });

  it("different seeds produce different startPositions", () => {
    const r1 = runStartPositions(makeParams({ seed: 7 }));
    const r2 = runStartPositions(makeParams({ seed: 8 }));
    expect(r1.startPositions.startPositions).not.toEqual(r2.startPositions.startPositions);
  });
});
