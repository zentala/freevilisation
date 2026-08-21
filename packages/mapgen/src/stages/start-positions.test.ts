import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateStartPositions } from "./start-positions.js";
import { generateMap } from "../pipeline.js";
import type { MapGenParams } from "../pipeline.js";
import type { ClimateResult } from "./climate.js";
import type { ResourcesResult } from "./resources.js";
import { makeParams, runStartPositions } from "./start-positions.test-fixtures.js";

describe("generateStartPositions — lifecycle and contract", () => {
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

  it("tiny pool: quality floor relaxation returns numPlayers when enough land tiles exist", () => {
    const params = makeParams({ mapSize: "tiny", numPlayers: 2 });
    const { startPositions } = runStartPositions(params);
    expect(startPositions.startPositions.length).toBe(2);
  });

  it("impossible map: throws when fewer land tiles than players", () => {
    const minimalLandmass = {
      width: 5,
      height: 5,
      elevation: new Array(25),
      isLand: new Array(25).fill(false),
    };
    const params: MapGenParams = {
      seed: 12345,
      mapType: "continents",
      mapSize: "tiny",
      numPlayers: 30,
    };
    const climate: ClimateResult = { terrainDefId: new Array(25).fill(null) };
    const resources: ResourcesResult = { resourceDefId: new Array(25).fill(null) };
    expect(() =>
      generateStartPositions(params, minimalLandmass, climate, resources, {
        prng: createPrng(12345).fork("test"),
        onProgress: () => {},
      }),
    ).toThrow(
      "Cannot place 30 players on a map with 0 land tiles; " +
        "place fewer players or use a larger map.",
    );
  });

  it("generateMap reproduces the stage run: same seed, same forked stream", () => {
    // Pins the PRNG fork label the pipeline uses. Rename the fork and the
    // pipeline stays internally deterministic while silently drawing from a
    // different stream than the stage harness.
    const params = makeParams({ mapSize: "standard", numPlayers: 6 });
    expect(generateMap(params).startPositions).toEqual(
      runStartPositions(params).startPositions.startPositions,
    );
  });
});
