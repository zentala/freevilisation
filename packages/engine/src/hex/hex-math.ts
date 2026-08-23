import type { AxialCoord } from "./coords.js";

/**
 * The six pointy-top axial neighbor directions, in fixed order.
 * This order is part of the contract — it controls iteration order
 * everywhere downstream, and iteration order is part of determinism.
 */
export const AXIAL_DIRECTIONS: readonly AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
] as const;

/**
 * How many of the six edge directions a tile owns storage for: 0, 1, 2.
 * The edge in direction `d >= OWNED_EDGE_DIRECTIONS` is owned by the
 * neighbour in that direction, at that neighbour's own index
 * `d - OWNED_EDGE_DIRECTIONS` — directions `d` and `(d + 3) % 6` are
 * opposites, so every edge has exactly one owner. See DATA-MODEL.md
 * "River edges" and ADR-026.
 */
export const OWNED_EDGE_DIRECTIONS = 3;

/**
 * Optional context for east-west cylinder wrap.
 * The world wraps on `q` only — never on `r`. A cylinder, not a torus.
 */
export interface WrapContext {
  /** Whether east-west wrapping is active. */
  readonly isWraparoundX: boolean;
  /** Map width in hexes, must be > 0. */
  readonly width: number;
}

/**
 * Wraps a q coordinate into the range `[0, width)` using double-modulo.
 *
 * JavaScript's `%` keeps the sign of the dividend, so `-1 % 16` is `-1`,
 * not `15`. The double-modulo fixes that.
 *
 * `width <= 0` throws.
 */
export function wrapQ(q: number, width: number): number {
  if (width <= 0) {
    throw new Error(`wrapQ width must be positive, got ${width}`);
  }
  return ((q % width) + width) % width;
}

/**
 * Returns the single neighbor of `c` in the given direction index.
 */
export function neighbor(c: AxialCoord, direction: number): AxialCoord {
  const d = AXIAL_DIRECTIONS[direction]!;
  return { q: c.q + d.q, r: c.r + d.r };
}

/**
 * Returns all 6 neighbors of `c` in `AXIAL_DIRECTIONS` order.
 *
 * When `wrap` is provided and `wrap.isWraparoundX` is true, each
 * result's q is wrapped through `wrapQ`. North and south are hard edges —
 * `r` is never wrapped.
 */
export function neighbors(c: AxialCoord, wrap?: WrapContext): AxialCoord[] {
  if (!wrap?.isWraparoundX) {
    return AXIAL_DIRECTIONS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }));
  }
  return AXIAL_DIRECTIONS.map((d) => ({
    q: wrapQ(c.q + d.q, wrap.width),
    r: c.r + d.r,
  }));
}

/**
 * Cube-distance between two axial coordinates.
 * Formula: (|dq| + |dq + dr| + |dr|) / 2
 */
function cubeDistance(a: AxialCoord, b: AxialCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

/**
 * Cube-distance between two axial coordinates.
 * Formula: (|dq| + |dq + dr| + |dr|) / 2
 */
export function distance(a: AxialCoord, b: AxialCoord, wrap?: WrapContext): number {
  if (!wrap?.isWraparoundX) {
    return cubeDistance(a, b);
  }
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const d0 = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
  const d1 = (Math.abs(dq - wrap.width) + Math.abs(dq - wrap.width + dr) + Math.abs(dr)) / 2;
  const d2 = (Math.abs(dq + wrap.width) + Math.abs(dq + wrap.width + dr) + Math.abs(dr)) / 2;
  return Math.min(d0, d1, d2);
}

/**
 * Rounding bias used to break ties on exact half-way hexes during
 * cube-coordinate interpolation.  Adding this tiny value to the
 * z-axis before rounding ensures consistent results on equidistant
 * candidates — it is not arbitrary noise.
 */
const ROUNDING_BIAS = 1e-6;

/**
 * Rounds fractional cube coordinates to the nearest hex.
 * Cube constraint: q + r + s = 0.
 */
function cubeRound(q: number, r: number, s: number): AxialCoord {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr };
}

/**
 * Returns all coordinates on the ring at exactly `radius` steps from `center`.
 *
 * - `ring(c, 0)` returns `[c]`.
 * - `ring(c, n)` for `n > 0` returns exactly `6n` coordinates.
 * - `radius < 0` throws.
 */
export function ring(center: AxialCoord, radius: number): AxialCoord[] {
  if (radius < 0) {
    throw new Error(`Ring radius must be non-negative, got ${radius}`);
  }
  if (radius === 0) {
    return [{ q: center.q, r: center.r }];
  }

  const results: AxialCoord[] = [];

  // Start at the hex `radius` steps in direction 4 ({q:-1, r:1})
  let c = {
    q: center.q + AXIAL_DIRECTIONS[4]!.q * radius,
    r: center.r + AXIAL_DIRECTIONS[4]!.r * radius,
  };

  for (let dir = 0; dir < 6; dir++) {
    for (let step = 0; step < radius; step++) {
      results.push({ q: c.q, r: c.r });
      c = {
        q: c.q + AXIAL_DIRECTIONS[dir]!.q,
        r: c.r + AXIAL_DIRECTIONS[dir]!.r,
      };
    }
  }

  return results;
}

/**
 * Returns all coordinates within `radius` steps of `center` (inclusive).
 *
 * Result contains `3n(n+1) + 1` coordinates in ascending ring order
 * (centre first, then ring 1, then ring 2, etc.).
 * `radius < 0` throws.
 */
export function range(center: AxialCoord, radius: number): AxialCoord[] {
  if (radius < 0) {
    throw new Error(`Range radius must be non-negative, got ${radius}`);
  }

  const results: AxialCoord[] = [];
  for (let r = 0; r <= radius; r++) {
    results.push(...ring(center, r));
  }
  return results;
}

/**
 * Returns all coordinates on the line from `a` to `b` (endpoint-inclusive).
 *
 * Uses fractional cube interpolation and `cubeRound` to determine
 * each intermediate hex.  `line(a, a)` is `[a]`, and
 * `line(a, b).length === distance(a, b) + 1`.
 *
 * When `wrap` is provided and `wrap.isWraparoundX` is true, the target
 * representative closest to `a` (of `b`, `b - width`, `b + width`) is
 * chosen, interpolation runs towards that, and every produced q is wrapped.
 */
export function line(a: AxialCoord, b: AxialCoord, wrap?: WrapContext): AxialCoord[] {
  const d = distance(a, b, wrap);
  if (d === 0) {
    return [{ q: a.q, r: a.r }];
  }

  let target = b;
  if (wrap?.isWraparoundX) {
    const candidates: AxialCoord[] = [
      b,
      { q: b.q - wrap.width, r: b.r },
      { q: b.q + wrap.width, r: b.r },
    ];
    let bestDist = Infinity;
    for (const cand of candidates) {
      const dist = cubeDistance(a, cand);
      if (dist < bestDist) {
        bestDist = dist;
        target = cand;
      }
    }
  }

  const results: AxialCoord[] = [];
  const n = d;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // Interpolate in cube space: s = -q - r
    const aS = -a.q - a.r;
    const bS = -target.q - target.r;
    const fq = a.q + (target.q - a.q) * t;
    const fr = a.r + (target.r - a.r) * t;
    const fs = aS + (bS - aS) * t;
    // Nudge one axis to break ties on exact half-way hexes
    const rounded = cubeRound(fq + ROUNDING_BIAS, fr, fs);
    if (wrap?.isWraparoundX) {
      results.push({ q: wrapQ(rounded.q, wrap.width), r: rounded.r });
    } else {
      results.push(rounded);
    }
  }
  return results;
}
