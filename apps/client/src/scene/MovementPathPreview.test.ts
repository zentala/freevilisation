import type { HexKey } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import { buildPathPreviewPoints } from "./MovementPathPreview";

describe("buildPathPreviewPoints", () => {
  it("converts every path waypoint in order", () => {
    const points = buildPathPreviewPoints(["0,0", "1,0", "1,1"] as HexKey[]);
    expect(points.map((point) => point.toArray())).toEqual([
      [0, 0, 0],
      [Math.sqrt(3), 0, 0],
      [(Math.sqrt(3) * 3) / 2, 0, 1.5],
    ]);
  });

  it("supports negative axial coordinates", () => {
    const points = buildPathPreviewPoints(["-2,3"] as HexKey[]);
    expect(points[0]?.toArray()).toEqual([-Math.sqrt(3) / 2, 0, 4.5]);
  });
});
