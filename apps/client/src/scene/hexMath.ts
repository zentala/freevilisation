import type { AxialCoord } from "@freevilisation/engine";
import { Vector3 } from "three";

/** Distance from the centre of a hex to any of its corners, in world units. */
export const HEX_SIZE = 1;

const SQRT_THREE = Math.sqrt(3);

/**
 * Converts a pointy-top axial coordinate to the centre of its world hex.
 *
 * The x/z layout is the same convention used by honeycomb-grid: q advances
 * east, while r advances south-east. The y component is reserved for terrain
 * elevation and is therefore always zero for a tile centre.
 */
export function axialToWorld(coord: AxialCoord): Vector3 {
  return new Vector3(
    HEX_SIZE * SQRT_THREE * (coord.q + coord.r / 2),
    0,
    HEX_SIZE * 1.5 * coord.r,
  );
}

/**
 * Converts a world point to the nearest pointy-top axial hex coordinate.
 * The y component is intentionally ignored because picking happens on the
 * ground plane and terrain elevation does not change the tile footprint.
 */
export function worldToAxial(point: Vector3): AxialCoord {
  const fractionalQ =
    ((SQRT_THREE / 3) * point.x - (1 / 3) * point.z) / HEX_SIZE;
  const fractionalR = ((2 / 3) * point.z) / HEX_SIZE;
  const fractionalS = -fractionalQ - fractionalR;

  let q = Math.round(fractionalQ);
  let r = Math.round(fractionalR);
  let s = Math.round(fractionalS);
  const qDifference = Math.abs(q - fractionalQ);
  const rDifference = Math.abs(r - fractionalR);
  const sDifference = Math.abs(s - fractionalS);

  if (qDifference > rDifference && qDifference > sDifference) {
    q = -r - s;
  } else if (rDifference > sDifference) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  return { q, r };
}
