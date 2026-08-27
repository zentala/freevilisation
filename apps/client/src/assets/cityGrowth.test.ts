import { describe, expect, it } from "vitest";
import { cityGrowthVisual, scaleCitySpec } from "./cityGrowth";

describe("city growth visuals", () => {
  it("increases height, footprint, and composition complexity from population 1 to 8", () => {
    const small = cityGrowthVisual(1);
    const large = cityGrowthVisual(8);
    expect(large.height).toBeGreaterThan(small.height);
    expect(large.footprint).toBeGreaterThan(small.footprint);
    expect(large.extraShapes).toBeGreaterThan(small.extraShapes);
  });

  it("scales a city spec without changing the source", () => {
    const spec = { shapes: [{ kind: "box" as const, scale: [1, 1, 1] as [number, number, number] }] };
    const grown = scaleCitySpec(spec, 8);
    expect(grown.shapes[0]?.scale?.[1]).toBeGreaterThan(1);
    expect(grown.shapes.length).toBeGreaterThan(spec.shapes.length);
    expect(spec.shapes).toHaveLength(1);
  });
});
