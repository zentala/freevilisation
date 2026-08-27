import { describe, it, expect } from "vitest";
import { MAP_SIZES, MAP_TYPE_PRESETS } from "./config.js";
import type { MapSize, MapType } from "./pipeline.js";

const SIZE_KEYS: readonly MapSize[] = ["tiny", "small", "standard", "large", "huge"];
const TYPE_KEYS: readonly MapType[] = ["continents", "pangaea", "archipelago", "islands"];

describe("MAP_SIZES", () => {
  it("has exactly the 5 MapSize keys", () => {
    expect(Object.keys(MAP_SIZES).sort()).toEqual(SIZE_KEYS.slice().sort());
  });

  it("every width and height is a positive integer", () => {
    for (const key of SIZE_KEYS) {
      const { width, height } = MAP_SIZES[key]!;
      expect(Number.isInteger(width) && width > 0).toBe(true);
      expect(Number.isInteger(height) && height > 0).toBe(true);
    }
  });
});

describe("MAP_TYPE_PRESETS", () => {
  it("has exactly the 4 MapType keys", () => {
    expect(Object.keys(MAP_TYPE_PRESETS).sort()).toEqual(TYPE_KEYS.slice().sort());
  });

  it("continentWeight + detailWeight sums to 1 for every preset", () => {
    for (const key of TYPE_KEYS) {
      const preset = MAP_TYPE_PRESETS[key]!;
      expect(preset.continentWeight + preset.detailWeight).toBeCloseTo(1, 9);
    }
  });

  it("octaves >= 1 for every preset", () => {
    for (const key of TYPE_KEYS) {
      expect(MAP_TYPE_PRESETS[key]!.octaves).toBeGreaterThanOrEqual(1);
    }
  });

  it("targetLandFraction is in (0, 1) for every preset", () => {
    for (const key of TYPE_KEYS) {
      const t = MAP_TYPE_PRESETS[key]!.targetLandFraction;
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(1);
    }
  });
});
