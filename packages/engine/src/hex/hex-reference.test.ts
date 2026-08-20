import { describe, it, expect } from "vitest";
import type { AxialCoord } from "./coords.js";
import { cubeS, toHexKey, coordsEqual } from "./coords.js";
import { distance, ring, range, line } from "./hex-math.js";

const O: AxialCoord = { q: 0, r: 0 };

/**
 * Reference values from Red Blob Games' hexagons article, pointy-top axial,
 * s = -q - r. Every expected value is a literal hand-derived from the cube
 * formulas, not computed from the implementation under test.
 */
describe("hex-reference", () => {
  const distanceCases: {
    name: string;
    a: AxialCoord;
    b: AxialCoord;
    expected: number;
  }[] = [
    { name: "identical at origin", a: O, b: O, expected: 0 },
    { name: "identical away from origin", a: { q: 3, r: -2 }, b: { q: 3, r: -2 }, expected: 0 },
    { name: "unit +q", a: O, b: { q: 1, r: 0 }, expected: 1 },
    { name: "unit +r", a: O, b: { q: 0, r: 1 }, expected: 1 },
    { name: "unit +s", a: O, b: { q: -1, r: 1 }, expected: 1 },
    { name: "unit -q", a: O, b: { q: -1, r: 0 }, expected: 1 },
    { name: "unit -r", a: O, b: { q: 0, r: -1 }, expected: 1 },
    { name: "unit -s", a: O, b: { q: 1, r: -1 }, expected: 1 },
    { name: "pure q run", a: O, b: { q: 4, r: 0 }, expected: 4 },
    { name: "pure q run, negative", a: O, b: { q: -3, r: 0 }, expected: 3 },
    { name: "pure r run", a: O, b: { q: 0, r: 5 }, expected: 5 },
    { name: "pure r run, negative", a: O, b: { q: 0, r: -2 }, expected: 2 },
    { name: "pure s run (opposite signs)", a: O, b: { q: 3, r: -3 }, expected: 3 },
    { name: "pure s run, negative", a: O, b: { q: -2, r: 2 }, expected: 2 },
    { name: "both coordinates negative", a: { q: -2, r: -3 }, b: { q: -5, r: -7 }, expected: 7 },
    { name: "straddles the origin", a: { q: 2, r: 1 }, b: { q: -1, r: -3 }, expected: 7 },
  ];

  const ringCounts: [number, number][] = [
    [0, 1],
    [1, 6],
    [2, 12],
    [3, 18],
    [4, 24],
    [5, 30],
  ];

  const rangeCounts: [number, number][] = [
    [0, 1],
    [1, 7],
    [2, 19],
    [3, 37],
    [4, 61],
    [5, 91],
  ];

  const ringCenter: AxialCoord = { q: 3, r: -2 };
  const ring1: AxialCoord[] = [
    { q: 2, r: -1 },
    { q: 3, r: -1 },
    { q: 4, r: -2 },
    { q: 4, r: -3 },
    { q: 3, r: -3 },
    { q: 2, r: -2 },
  ];
  const ring2: AxialCoord[] = [
    { q: 1, r: 0 },
    { q: 2, r: 0 },
    { q: 3, r: 0 },
    { q: 4, r: -1 },
    { q: 5, r: -2 },
    { q: 5, r: -3 },
    { q: 5, r: -4 },
    { q: 4, r: -4 },
    { q: 3, r: -4 },
    { q: 2, r: -3 },
    { q: 1, r: -2 },
    { q: 1, r: -1 },
  ];

  const linePairs: [AxialCoord, AxialCoord][] = [
    [O, { q: 3, r: 0 }],
    [O, { q: 0, r: -2 }],
    [O, { q: 2, r: -2 }],
    [O, { q: 2, r: 1 }],
    [O, { q: 3, r: -3 }],
    [{ q: -1, r: -1 }, { q: 2, r: -3 }],
  ];

  const tiePair: [AxialCoord, AxialCoord] = [O, { q: 1, r: -3 }];
  const tieExpected: AxialCoord[] = [
    { q: 0, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -2 },
    { q: 1, r: -3 },
  ];

  function keysOf(coords: AxialCoord[]): string[] {
    return coords.map(toHexKey).sort();
  }

  describe("distance", () => {
    it.each(distanceCases)(
      "$name has distance $expected",
      ({ a, b, expected }) => {
        expect(distance(a, b)).toBe(expected);
        expect(distance(b, a)).toBe(expected);
      },
    );
  });

  describe("ring", () => {
    it.each(ringCounts)(
      "ring(origin, %i) returns %i hexes (6n for n > 0)",
      (radius, count) => {
        expect(ring(O, radius)).toHaveLength(count);
      },
    );

    it("ring((3,-2), 1) matches the reference coordinate set", () => {
      expect(keysOf(ring(ringCenter, 1))).toEqual(keysOf(ring1));
    });

    it("ring((3,-2), 2) matches the reference coordinate set", () => {
      expect(keysOf(ring(ringCenter, 2))).toEqual(keysOf(ring2));
    });
  });

  describe("range", () => {
    it.each(rangeCounts)(
      "range(origin, %i) returns %i hexes (3n(n+1) + 1)",
      (radius, count) => {
        expect(range(O, radius)).toHaveLength(count);
      },
    );

    it("range(c, n) is the duplicate-free union of rings 0..n", () => {
      for (const center of [O, ringCenter]) {
        for (let n = 0; n <= 5; n++) {
          const union = new Set<string>();
          for (let k = 0; k <= n; k++) {
            for (const c of ring(center, k)) {
              union.add(toHexKey(c));
            }
          }
          expect(keysOf(range(center, n))).toEqual([...union].sort());
        }
      }
    });
  });

  describe("line", () => {
    it.each(linePairs)(
      "line %o -> %o is endpoint-inclusive, consecutive, and free of repeats",
      (a, b) => {
        const l = line(a, b);
        expect(coordsEqual(l[0]!, a)).toBe(true);
        expect(coordsEqual(l[l.length - 1]!, b)).toBe(true);
        expect(l.length).toBe(distance(a, b) + 1);
        for (let i = 0; i < l.length - 1; i++) {
          expect(distance(l[i]!, l[i + 1]!)).toBe(1);
        }
        expect(new Set(l.map(toHexKey)).size).toBe(l.length);
      },
    );

    it("halfway tie case resolves to the reference sequence", () => {
      const [a, b] = tiePair;
      expect(line(a, b).map(toHexKey)).toEqual(tieExpected.map(toHexKey));
    });
  });

  describe("cubeS identity", () => {
    const allCoords: AxialCoord[] = [
      ...distanceCases.flatMap(({ a, b }) => [a, b]),
      ...ring1,
      ...ring2,
      ...linePairs.flat(),
      ...tieExpected,
    ];

    it("q + r + cubeS(c) === 0 for every coordinate in the tables", () => {
      for (const c of allCoords) {
        expect(c.q + c.r + cubeS(c)).toBe(0);
      }
    });
  });
});