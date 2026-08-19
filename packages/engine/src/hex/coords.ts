import type { HexKey } from "../ids.js";

/**
 * Axial hex coordinate in pointy-top orientation.
 * Plain readonly interface — serialises as `{q,r}`, no class overhead.
 */
export interface AxialCoord {
  readonly q: number;
  readonly r: number;
}

/**
 * Derives the cube-s coordinate from axial (q, r).
 * Cube constraint: q + r + s = 0, so s = −q − r.
 */
export function cubeS(c: AxialCoord): number {
  return -c.q - c.r;
}

/**
 * Converts an axial coordinate to its canonical string key `"q,r"`.
 */
export function toHexKey(c: AxialCoord): HexKey {
  return `${c.q},${c.r}` as HexKey;
}

/**
 * Parses a `HexKey` back into an axial coordinate.
 * Throws on any malformed key (not exactly two comma-separated integers).
 */
export function fromHexKey(key: HexKey): AxialCoord {
  const parts = (key as string).split(",");
  if (parts.length !== 2) {
    throw new Error(`Malformed HexKey: "${key}"`);
  }
  const q = Number(parts[0]);
  const r = Number(parts[1]);
  if (!Number.isFinite(q) || !Number.isFinite(r)) {
    throw new Error(`Malformed HexKey: "${key}"`);
  }
  return { q, r };
}

/**
 * Returns true if two axial coordinates are equal.
 */
export function coordsEqual(a: AxialCoord, b: AxialCoord): boolean {
  return a.q === b.q && a.r === b.r;
}
