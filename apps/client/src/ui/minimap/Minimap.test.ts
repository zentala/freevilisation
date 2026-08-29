import { AssetRegistry } from "@freevilisation/content";
import { describe, expect, it } from "vitest";
import { cameraTargetFor, canvasPointToAxial, terrainColor, viewportBox } from "./Minimap";

const map = { width: 20, height: 10 };

describe("Minimap", () => {
  it("uses the terrain palette and has a neutral fallback", () => {
    const registry = new AssetRegistry({
      terrain_grassland: { tier: "T0", palette: ["#75a85a"] },
    });

    expect(terrainColor(registry, "terrain_grassland")).toBe("#75a85a");
    expect(terrainColor(registry, "terrain_unknown")).toBe("#777777");
  });

  it("converts minimap points to bounded axial coordinates", () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 };

    expect(canvasPointToAxial(200, 100, rect, map)).toEqual({ q: 10, r: 5 });
    expect(canvasPointToAxial(-10, 500, rect, map)).toEqual({ q: 0, r: 9 });
  });

  it("projects the camera viewport onto the canvas", () => {
    expect(viewportBox({ minQ: 5, maxQ: 15, minR: 2, maxR: 6 }, map, 200, 100)).toEqual({
      x: 50,
      y: 20,
      width: 100,
      height: 40,
    });
  });

  it("turns a minimap coordinate into the main camera's world target", () => {
    expect(cameraTargetFor({ q: 1, r: 2 })).toEqual({
      x: 2 * Math.sqrt(3),
      z: 3,
    });
  });
});
