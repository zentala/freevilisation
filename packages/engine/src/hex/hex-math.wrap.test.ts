import { describe, it, expect } from "vitest";
import type { AxialCoord } from "./coords.js";
import { neighbors, distance, line, wrapQ, type WrapContext } from "./hex-math.js";

const O: AxialCoord = { q: 0, r: 0 };

describe("wrap", () => {
  const WRAP: WrapContext = { isWraparoundX: true, width: 20 };

  describe("wrapQ", () => {
    it("wrapQ(-1, 20) === 19", () => {
      expect(wrapQ(-1, 20)).toBe(19);
    });

    it("wrapQ(20, 20) === 0", () => {
      expect(wrapQ(20, 20)).toBe(0);
    });

    it("wrapQ(41, 20) === 1", () => {
      expect(wrapQ(41, 20)).toBe(1);
    });

    it("wrapQ(5, 20) === 5", () => {
      expect(wrapQ(5, 20)).toBe(5);
    });

    it("wrapQ(0, 0) throws", () => {
      expect(() => wrapQ(0, 0)).toThrow("positive");
    });
  });

  describe("off-switch", () => {
    const noWrap: WrapContext = { isWraparoundX: false, width: 20 };
    const pairs: [AxialCoord, AxialCoord][] = [
      [O, { q: 3, r: -3 }],
      [O, { q: 2, r: 1 }],
      [
        { q: 1, r: 0 },
        { q: 19, r: 0 },
      ],
      [
        { q: 18, r: 0 },
        { q: 1, r: 0 },
      ],
      [
        { q: 0, r: 5 },
        { q: 19, r: 5 },
      ],
    ];

    it("neighbors returns same result with no arg, false wrap, and WRAP for far-from-seam coords", () => {
      const far: AxialCoord = { q: 5, r: 5 };
      expect(neighbors(far)).toEqual(neighbors(far, noWrap));
      expect(neighbors(far)).toEqual(neighbors(far, WRAP));
    });

    it("distance returns same result with no arg, false wrap, and WRAP for far-from-seam coords", () => {
      const far: AxialCoord = { q: 5, r: 5 };
      const far2: AxialCoord = { q: 8, r: 3 };
      expect(distance(far, far2)).toEqual(distance(far, far2, noWrap));
      expect(distance(far, far2)).toEqual(distance(far, far2, WRAP));
    });

    it("line returns same result with no arg, false wrap, and WRAP for far-from-seam coords", () => {
      const far: AxialCoord = { q: 5, r: 5 };
      const far2: AxialCoord = { q: 8, r: 3 };
      expect(line(far, far2)).toEqual(line(far, far2, noWrap));
      expect(line(far, far2)).toEqual(line(far, far2, WRAP));
    });

    for (const [a, b] of pairs) {
      it(`distance(${a.q},${a.r} -> ${b.q},${b.r}) same with no wrap and false wrap`, () => {
        expect(distance(a, b)).toEqual(distance(a, b, noWrap));
      });
    }
  });

  describe("neighbors with wrap", () => {
    it("neighbors({q:19,r:0}, WRAP) contains {q:0,r:0} and {q:0,r:-1}", () => {
      const ns = neighbors({ q: 19, r: 0 }, WRAP);
      expect(ns).toContainEqual({ q: 0, r: 0 });
      expect(ns).toContainEqual({ q: 0, r: -1 });
    });

    it("neighbors({q:19,r:0}, WRAP) has exactly 6 results in direction order", () => {
      const ns = neighbors({ q: 19, r: 0 }, WRAP);
      expect(ns).toHaveLength(6);
      // q=19 + direction[0]={1,0} => q=0,r=0
      expect(ns[0]).toEqual({ q: 0, r: 0 });
      // q=19 + direction[1]={1,-1} => q=0,r=-1
      expect(ns[1]).toEqual({ q: 0, r: -1 });
    });

    it("neighbors({q:0,r:0}, WRAP) contains {q:19,r:0} and {q:19,r:1}", () => {
      const ns = neighbors({ q: 0, r: 0 }, WRAP);
      expect(ns).toContainEqual({ q: 19, r: 0 });
      expect(ns).toContainEqual({ q: 19, r: 1 });
    });

    it("every neighbor under WRAP has 0 <= q < 20", () => {
      const coords: AxialCoord[] = [
        { q: 0, r: 0 },
        { q: 19, r: 0 },
        { q: 0, r: 5 },
        { q: 19, r: -3 },
        { q: 10, r: 10 },
      ];
      for (const c of coords) {
        for (const n of neighbors(c, WRAP)) {
          expect(n.q).toBeGreaterThanOrEqual(0);
          expect(n.q).toBeLessThan(20);
        }
      }
    });
  });

  describe("distance with wrap", () => {
    it("distance({q:1,r:0}, {q:19,r:0}, WRAP) === 2", () => {
      expect(distance({ q: 1, r: 0 }, { q: 19, r: 0 }, WRAP)).toBe(2);
    });

    it("distance with wrap is symmetric", () => {
      expect(distance({ q: 1, r: 0 }, { q: 19, r: 0 }, WRAP)).toBe(
        distance({ q: 19, r: 0 }, { q: 1, r: 0 }, WRAP),
      );
    });

    it("same pair without wrap is 18 — asserting both in same test", () => {
      const a: AxialCoord = { q: 1, r: 0 };
      const b: AxialCoord = { q: 19, r: 0 };
      expect(distance(a, b, WRAP)).toBe(2);
      expect(distance(a, b)).toBe(18);
    });

    it("distance across seam never exceeds unwrapped distance (6 pairs)", () => {
      const pairs: [AxialCoord, AxialCoord][] = [
        [
          { q: 1, r: 0 },
          { q: 19, r: 0 },
        ],
        [
          { q: 0, r: 0 },
          { q: 19, r: 0 },
        ],
        [
          { q: 2, r: 3 },
          { q: 18, r: 3 },
        ],
        [
          { q: 19, r: 0 },
          { q: 0, r: 0 },
        ],
        [
          { q: 18, r: 5 },
          { q: 1, r: 5 },
        ],
        [
          { q: 0, r: -2 },
          { q: 19, r: -2 },
        ],
      ];
      for (const [a, b] of pairs) {
        expect(distance(a, b, WRAP)).toBeLessThanOrEqual(distance(a, b));
      }
    });
  });

  describe("line with wrap", () => {
    const a: AxialCoord = { q: 18, r: 0 };
    const b: AxialCoord = { q: 1, r: 0 };

    it("line({q:18,r:0}, {q:1,r:0}, WRAP) length === distance + 1", () => {
      const l = line(a, b, WRAP);
      expect(l.length).toBe(distance(a, b, WRAP) + 1);
    });

    it("every consecutive pair in wrapped line is at wrapped distance 1", () => {
      const l = line(a, b, WRAP);
      for (let i = 0; i < l.length - 1; i++) {
        expect(distance(l[i]!, l[i + 1]!, WRAP)).toBe(1);
      }
    });

    it("every element in wrapped line has 0 <= q < 20", () => {
      const l = line(a, b, WRAP);
      for (const c of l) {
        expect(c.q).toBeGreaterThanOrEqual(0);
        expect(c.q).toBeLessThan(20);
      }
    });

    it("wrapped line starts at a and ends at b", () => {
      const l = line(a, b, WRAP);
      expect(l[0]).toEqual(a);
      expect(l[l.length - 1]).toEqual(b);
    });
  });
});
