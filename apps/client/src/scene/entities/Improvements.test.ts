import { describe, expect, it } from "vitest";
import { improvementKind, terrainOrientation } from "./Improvements";

describe("improvement rendering", () => {
  it("maps farm, mine, and road definitions to primitives", () => {
    expect(improvementKind("improvement_farm")).toBe("farm");
    expect(improvementKind("improvement_mine")).toBe("mine");
    expect(improvementKind("improvement_road")).toBe("road");
    expect(improvementKind(null)).toBeNull();
  });

  it("rotates improvements on elevated terrain", () => {
    expect(terrainOrientation("terrain_grassland")).toBe(0);
    expect(terrainOrientation("terrain_hills")).toBe(Math.PI / 6);
  });
});
