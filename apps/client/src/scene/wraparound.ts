import type { AxialCoord } from "@freevilisation/engine";
import { axialToWorld } from "./hexMath";

/** Horizontal world-space period for an axial map of the given width. */
export function wrapPeriod(width: number): number {
  if (!Number.isInteger(width) || width <= 0) throw new Error("width must be positive");
  return Math.sqrt(3) * width;
}

/** Returns the three copies used to keep a cylindrical seam continuously visible. */
export function wrapOffsets(isWraparoundX: boolean, width: number): readonly number[] {
  if (!isWraparoundX) return [0];
  const period = wrapPeriod(width);
  return [-period, 0, period];
}

/** World-space positions for a tile and its seam copies. */
export function wrappedTilePositions(
  coord: AxialCoord,
  isWraparoundX: boolean,
  width: number,
): readonly ReturnType<typeof axialToWorld>[] {
  const base = axialToWorld(coord);
  return wrapOffsets(isWraparoundX, width).map((offset) => base.clone().setX(base.x + offset));
}
