import type { AxialCoord } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { axialToWorld, HEX_SIZE, worldToAxial } from "./hexMath";

describe("hexMath", () => {
  it("uses pointy-top axial reference positions", () => {
    expect(axialToWorld({ q: 0, r: 0 })).toEqual(new Vector3(0, 0, 0));
    expect(axialToWorld({ q: 1, r: 0 })).toEqual(
      new Vector3(Math.sqrt(3) * HEX_SIZE, 0, 0),
    );
    expect(axialToWorld({ q: 0, r: 1 })).toEqual(
      new Vector3((Math.sqrt(3) / 2) * HEX_SIZE, 0, 1.5 * HEX_SIZE),
    );
  });

  it.each<AxialCoord>([
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -4, r: 3 },
    { q: 7, r: -9 },
  ])("round-trips axial coordinate %o", (coord) => {
    expect(worldToAxial(axialToWorld(coord))).toEqual(coord);
  });

  it("rounds points inside a hex to that hex", () => {
    const centre = axialToWorld({ q: -2, r: 5 });
    const point = centre.clone().add(new Vector3(0.2, 17, -0.1));

    expect(worldToAxial(point)).toEqual({ q: -2, r: 5 });
  });

  it("ignores world elevation when resolving a tile", () => {
    expect(worldToAxial(new Vector3(Math.sqrt(3), 999, 0))).toEqual({
      q: 1,
      r: 0,
    });
  });
});
