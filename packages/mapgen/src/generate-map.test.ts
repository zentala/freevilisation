import { describe, expect, it } from "vitest";
import { generateMap } from "./pipeline.js";
import type { MapType } from "./pipeline.js";

const GOLDEN_CASES: readonly { readonly mapType: MapType; readonly seed: number }[] = [
  { mapType: "continents", seed: 42 },
  { mapType: "pangaea", seed: 42 },
  { mapType: "archipelago", seed: 42 },
  { mapType: "islands", seed: 42 },
];

describe("generateMap golden seeds", () => {
  for (const { mapType, seed } of GOLDEN_CASES) {
    it(`${mapType} seed ${seed} matches the committed output`, () => {
      const result = generateMap({ seed, mapType, mapSize: "tiny" });

      expect(result).toMatchSnapshot();
    });
  }
});
