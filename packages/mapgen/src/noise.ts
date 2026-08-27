import type { Prng } from "@freevilisation/engine";

/**
 * Draws a uint32 seed from a `Prng`, for handing to `fractalNoise2D`/
 * `valueNoise2D` (which take a plain integer seed, not a `Prng`).
 */
export function drawSeed(prng: Prng): number {
  return Math.floor(prng.next() * 0x100000000) >>> 0;
}

/**
 * Deterministic lattice hash for value noise.
 *
 * Returns a pseudo-random value in [0, 1) for integer lattice coordinates
 * and a seed. Uses only `Math.imul` for integer math — no floats, no trig.
 */
export function hashLattice(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * 2D value noise — bilinear interpolation of lattice hashes with smoothstep.
 *
 * Returns a value in [0, 1) for any real `(x, y)` and integer seed.
 */
export function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);
  const n00 = hashLattice(x0, y0, seed);
  const n10 = hashLattice(x0 + 1, y0, seed);
  const n01 = hashLattice(x0, y0 + 1, seed);
  const n11 = hashLattice(x0 + 1, y0 + 1, seed);
  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  return ix0 + (ix1 - ix0) * sy;
}

/**
 * Value at the given quantile of a sample, computed over a sorted copy.
 *
 * `quantile` is a fraction in [0, 1]: the returned value is the one below
 * or at which approximately that fraction of `values` falls. Used to turn
 * a fixed threshold on raw noise output (whose distribution nobody
 * verified) into a threshold on the actual observed distribution, so a
 * band's tile share tracks its target fraction regardless of seed, noise
 * octave count or upstream skew (Unciv/Freeciv/WorldEngine approach;
 * `find_threshold_f()` in WorldEngine).
 *
 * Returns 0 for an empty sample — callers only ever consult that result
 * when the band it belongs to is itself empty.
 */
export function percentileThreshold(values: readonly number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(Math.max(Math.floor(quantile * sorted.length), 0), sorted.length - 1);
  return sorted[index]!;
}

/**
 * Fractal (fBm) value noise — layered `valueNoise2D` with configurable
 * octaves, persistence and lacunarity.
 *
 * Returns a value in [0, 1). Throws if `octaves <= 0`.
 */
export function fractalNoise2D(
  x: number,
  y: number,
  seed: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
): number {
  if (octaves <= 0) {
    throw new Error(`octaves must be positive, got ${octaves}`);
  }
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let maxAmplitude = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise2D(x * frequency, y * frequency, seed + o * 1000003) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return sum / maxAmplitude;
}
