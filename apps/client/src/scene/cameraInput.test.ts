import { describe, expect, it } from "vitest";
import { getEdgePan, getKeyboardPan } from "./cameraInput";

describe("getKeyboardPan", () => {
  it("maps WASD and arrows to world movement", () => {
    expect(getKeyboardPan(new Set(["w", "ArrowRight"]))).toMatchObject({
      x: expect.closeTo(Math.SQRT1_2),
      z: expect.closeTo(-Math.SQRT1_2),
    });
  });

  it("normalizes diagonal movement", () => {
    expect(getKeyboardPan(new Set(["a", "s"]))).toMatchObject({
      x: expect.closeTo(-Math.SQRT1_2),
      z: expect.closeTo(Math.SQRT1_2),
    });
  });
});

describe("getEdgePan", () => {
  const rect = { left: 100, right: 900, top: 50, bottom: 650 };

  it("returns no movement in the safe area", () => {
    expect(getEdgePan(500, 350, rect)).toEqual({ x: 0, z: 0 });
  });

  it("scales movement toward viewport edges", () => {
    expect(getEdgePan(100, 50, rect)).toMatchObject({
      x: expect.closeTo(-Math.SQRT1_2),
      z: expect.closeTo(-Math.SQRT1_2),
    });
  });
});
