import { describe, expect, it } from "vitest";
import { stackOffset } from "./stacking";

describe("stackOffset", () => {
  it("keeps a city at the hex center", () => {
    expect(stackOffset("city", 99)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("assigns deterministic distinct offsets to the first unit slots", () => {
    const offsets = [0, 1, 2, 3].map((index) => stackOffset("unit", index));
    expect(new Set(offsets.map((offset) => `${offset.x},${offset.z}`)).size).toBe(4);
    expect(stackOffset("unit", 0)).toEqual(stackOffset("unit", 6));
    expect(offsets[0]).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("rejects invalid stack indexes", () => {
    expect(() => stackOffset("unit", -1)).toThrow();
    expect(() => stackOffset("unit", 1.5)).toThrow();
  });
});
