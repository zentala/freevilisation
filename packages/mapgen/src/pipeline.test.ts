import { describe, it, expect } from "vitest";
import { generateMap } from "./pipeline.js";
import { MAP_SIZES } from "./config.js";
import type { MapType, MapSize } from "./pipeline.js";

const MAP_TYPES: readonly MapType[] = ["continents", "pangaea", "archipelago", "islands"];

describe("generateMap", () => {
  for (const mapType of MAP_TYPES) {
    it(`${mapType} tiny: width/height match MAP_SIZES and arrays have correct length`, () => {
      const result = generateMap({ seed: 42, mapType, mapSize: "tiny" });
      const { width, height } = MAP_SIZES.tiny!;
      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      expect(result.elevation.length).toBe(width * height);
      expect(result.isLand.length).toBe(width * height);
    });
  }

  it("throws on unknown mapType", () => {
    expect(() => generateMap({ seed: 1, mapType: "blob" as MapType, mapSize: "tiny" })).toThrow(
      'Unknown mapType: "blob"',
    );
  });

  it("throws on prototype-keyed mapType (Object.prototype.constructor)", () => {
    expect(() =>
      generateMap({ seed: 1, mapType: "constructor" as MapType, mapSize: "tiny" }),
    ).toThrow('Unknown mapType: "constructor"');
  });

  it("throws on unknown mapSize", () => {
    expect(() =>
      generateMap({ seed: 1, mapType: "continents", mapSize: "mega" as MapSize }),
    ).toThrow('Unknown mapSize: "mega"');
  });

  it("throws on prototype-keyed mapSize (Object.prototype.constructor)", () => {
    expect(() =>
      generateMap({ seed: 1, mapType: "continents", mapSize: "constructor" as MapSize }),
    ).toThrow('Unknown mapSize: "constructor"');
  });

  it("determinism: same params produce deeply-equal elevation and isLand", () => {
    const params = { seed: 9999, mapType: "pangaea" as const, mapSize: "small" as const };
    const r1 = generateMap(params);
    const r2 = generateMap(params);
    expect(r1.elevation).toEqual(r2.elevation);
    expect(r1.isLand).toEqual(r2.isLand);
  });

  it("different seeds produce different elevation arrays", () => {
    const r1 = generateMap({ seed: 1, mapType: "continents", mapSize: "tiny" });
    const r2 = generateMap({ seed: 2, mapType: "continents", mapSize: "tiny" });
    expect(r1.elevation).not.toEqual(r2.elevation);
  });

  it("onProgress: spy is called at least twice, non-decreasing, last call is 100", () => {
    const calls: number[] = [];
    generateMap({ seed: 1, mapType: "continents", mapSize: "tiny" }, (pct) => calls.push(pct));
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i]!).toBeGreaterThanOrEqual(calls[i - 1]!);
    }
    expect(calls[calls.length - 1]).toBe(100);
  });

  // continents, pangaea and islands model a full globe and wrap; archipelago
  // models a bounded rectangle of scattered islands and stays flat. This test
  // fails if the reported flag stops matching what config.ts declares.
  it("reports isWraparoundX matching the map type's preset", () => {
    expect(generateMap({ seed: 1, mapType: "continents", mapSize: "tiny" }).isWraparoundX).toBe(
      true,
    );
    expect(generateMap({ seed: 1, mapType: "archipelago", mapSize: "tiny" }).isWraparoundX).toBe(
      false,
    );
  });

  it("onProgress omitted does not throw", () => {
    expect(() => generateMap({ seed: 1, mapType: "continents", mapSize: "tiny" })).not.toThrow();
  });

  it("wires startPositions through to the result: on land, unique, numPlayers of them", () => {
    const result = generateMap({ seed: 42, mapType: "continents", mapSize: "tiny", numPlayers: 6 });
    expect(result.startPositions.length).toBe(6);
    const seen = new Set<string>();
    for (const { q, r } of result.startPositions) {
      expect(result.isLand[r * result.width + q]).toBe(true);
      const key = `${q},${r}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("defaults to 4 start positions when numPlayers is omitted", () => {
    const result = generateMap({ seed: 42, mapType: "continents", mapSize: "tiny" });
    expect(result.startPositions.length).toBe(4);
  });
});
