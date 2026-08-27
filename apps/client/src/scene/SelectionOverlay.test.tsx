import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { highlightPosition } from "./SelectionOverlay";

describe("highlightPosition", () => {
  it("keeps a highlight over the selected axial hex", () => {
    expect(highlightPosition({ q: 2, r: -1 }, 0.13)).toEqual(
      new Vector3(Math.sqrt(3) * 1.5, 0.13, -1.5),
    );
  });

  it("does not mutate the coordinate conversion result between calls", () => {
    const first = highlightPosition({ q: 0, r: 0 }, 0.08);
    const second = highlightPosition({ q: 0, r: 0 }, 0.13);
    expect(first.y).toBe(0.08);
    expect(second.y).toBe(0.13);
  });
});
