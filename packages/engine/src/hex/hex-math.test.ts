import { describe, it, expect } from "vitest";
import type { AxialCoord } from "./coords.js";
import {
  AXIAL_DIRECTIONS,
  neighbor,
  neighbors,
  distance,
  ring,
  range,
  line,
  wrapQ,
  type WrapContext,
} from "./hex-math.js";

const O: AxialCoord = { q: 0, r: 0 };

describe("hex-math", () => {
  describe("neighbors", () => {
    it("returns exactly 6 coordinates", () => {
      expect(neighbors(O)).toHaveLength(6);
    });

    it("returns neighbors in AXIAL_DIRECTIONS order", () => {
      const result = neighbors(O);
      for (let i = 0; i < 6; i++) {
        expect(result[i]).toEqual(AXIAL_DIRECTIONS[i]);
      }
    });

    it("each neighbor is at distance 1 from center", () => {
      for (const n of neighbors(O)) {
        expect(distance(O, n)).toBe(1);
      }
    });

    it("neighbor() matches the corresponding element of neighbors()", () => {
      const ns = neighbors(O);
      for (let i = 0; i < 6; i++) {
        expect(neighbor(O, i)).toEqual(ns[i]);
      }
    });
  });

  describe("distance", () => {
    it("is zero to itself", () => {
      expect(distance(O, O)).toBe(0);
    });

    it("is symmetric", () => {
      const a: AxialCoord = { q: 2, r: 1 };
      const b: AxialCoord = { q: -1, r: 3 };
      expect(distance(a, b)).toBe(distance(b, a));
    });

    it("(0,0) -> (3,-3) is 3", () => {
      expect(distance(O, { q: 3, r: -3 })).toBe(3);
    });

    it("(0,0) -> (2,1) is 3", () => {
      expect(distance(O, { q: 2, r: 1 })).toBe(3);
    });

    it("(-1,-1) -> (2,-3) is 3", () => {
      expect(distance({ q: -1, r: -1 }, { q: 2, r: -3 })).toBe(3);
    });

    it("(0,0) -> (0,5) is 5", () => {
      expect(distance(O, { q: 0, r: 5 })).toBe(5);
    });
  });

  describe("ring", () => {
    it("ring(c, 0) returns exactly [c]", () => {
      expect(ring(O, 0)).toEqual([O]);
    });

    it("ring(c, 1) returns exactly 6 coordinates", () => {
      expect(ring(O, 1)).toHaveLength(6);
    });

    it("ring(c, 3) returns exactly 18 coordinates", () => {
      expect(ring(O, 3)).toHaveLength(18);
    });

    it("every element of ring(c, n) is at distance exactly n", () => {
      for (const n of [1, 2, 3, 4, 5]) {
        for (const c of ring(O, n)) {
          expect(distance(O, c)).toBe(n);
        }
      }
    });

    it("throws on negative radius", () => {
      expect(() => ring(O, -1)).toThrow("non-negative");
    });
  });

  describe("range", () => {
    it("range(c, 0) returns exactly [c]", () => {
      expect(range(O, 0)).toEqual([O]);
    });

    it("range(c, 2) returns exactly 19 coordinates", () => {
      expect(range(O, 2)).toHaveLength(19);
    });

    it("range(c, 3) returns exactly 37 coordinates", () => {
      expect(range(O, 3)).toHaveLength(37);
    });

    it("contains no duplicates", () => {
      const coords = range(O, 3);
      const keys = new Set(coords.map((c) => `${c.q},${c.r}`));
      expect(keys.size).toBe(coords.length);
    });

    it("centre is the first element", () => {
      expect(range(O, 3)[0]).toEqual(O);
    });

    it("throws on negative radius", () => {
      expect(() => range(O, -1)).toThrow("non-negative");
    });
  });

  describe("line", () => {
    it("line(a, a) returns [a]", () => {
      expect(line(O, O)).toEqual([O]);
    });

    it("line length equals distance + 1 for several pairs", () => {
      const pairs: [AxialCoord, AxialCoord][] = [
        [O, { q: 3, r: -3 }],
        [O, { q: 2, r: 1 }],
        [O, { q: 0, r: 5 }],
        [{ q: -1, r: -1 }, { q: 2, r: -3 }],
        [{ q: 5, r: -2 }, { q: -3, r: 4 }],
      ];
      for (const [a, b] of pairs) {
        expect(line(a, b).length).toBe(distance(a, b) + 1);
      }
    });

    it("every consecutive pair in a line is at distance 1", () => {
      const pairs: [AxialCoord, AxialCoord][] = [
        [O, { q: 3, r: -3 }],
        [O, { q: 2, r: 1 }],
        [O, { q: 0, r: 5 }],
        [{ q: -1, r: -1 }, { q: 2, r: -3 }],
      ];
      for (const [a, b] of pairs) {
        const l = line(a, b);
        for (let i = 0; i < l.length - 1; i++) {
          expect(distance(l[i]!, l[i + 1]!)).toBe(1);
        }
      }
    });

    it("line endpoints are correct", () => {
      const a: AxialCoord = { q: 1, r: 2 };
      const b: AxialCoord = { q: 4, r: -1 };
      const l = line(a, b);
      expect(l[0]).toEqual(a);
      expect(l[l.length - 1]).toEqual(b);
    });

    it("line midpoint between (0,0) and (-1,-1) is (0,-1), not (0,0)", () => {
      const l = line(O, { q: -1, r: -1 });
      expect(l).toHaveLength(3);
      expect(l[0]!.q + 0).toBe(0);
      expect(l[0]!.r).toBe(0);
      expect(l[1]!.q + 0).toBe(0);
      expect(l[1]!.r).toBe(-1);
      expect(l[2]!.q).toBe(-1);
      expect(l[2]!.r).toBe(-1);
    });

    it("line midpoint between (1,1) and (-1,-1) passes through (0,0)", () => {
      const l = line({ q: 1, r: 1 }, { q: -1, r: -1 });
      expect(l).toHaveLength(5);
      expect(l[0]!.q).toBe(1);
      expect(l[0]!.r).toBe(1);
      expect(l[1]!.q).toBe(1);
      expect(l[1]!.r).toBe(0);
      expect(l[2]!.q + 0).toBe(0);
      expect(l[2]!.r).toBe(0);
      expect(l[3]!.q + 0).toBe(0);
      expect(l[3]!.r).toBe(-1);
      expect(l[4]!.q).toBe(-1);
      expect(l[4]!.r).toBe(-1);
    });

    it("line (0,0) to (-2,-2) steps through correct half-way hexes", () => {
      const l = line(O, { q: -2, r: -2 });
      expect(l).toHaveLength(5);
      expect(l[0]!.q + 0).toBe(0);
      expect(l[0]!.r).toBe(0);
      expect(l[1]!.q + 0).toBe(0);
      expect(l[1]!.r).toBe(-1);
      expect(l[2]!.q).toBe(-1);
      expect(l[2]!.r).toBe(-1);
      expect(l[3]!.q).toBe(-1);
      expect(l[3]!.r).toBe(-2);
      expect(l[4]!.q).toBe(-2);
      expect(l[4]!.r).toBe(-2);
    });
  });

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
        [{ q: 1, r: 0 }, { q: 19, r: 0 }],
        [{ q: 18, r: 0 }, { q: 1, r: 0 }],
        [{ q: 0, r: 5 }, { q: 19, r: 5 }],
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
          [{ q: 1, r: 0 }, { q: 19, r: 0 }],
          [{ q: 0, r: 0 }, { q: 19, r: 0 }],
          [{ q: 2, r: 3 }, { q: 18, r: 3 }],
          [{ q: 19, r: 0 }, { q: 0, r: 0 }],
          [{ q: 18, r: 5 }, { q: 1, r: 5 }],
          [{ q: 0, r: -2 }, { q: 19, r: -2 }],
        ];
        for (const [a, b] of pairs) {
          expect(distance(a, b, WRAP)).toBeLessThanOrEqual(distance(a, b));
        }
      });
    });

    describe("line with wrap", () => {
      it("line({q:18,r:0}, {q:1,r:0}, WRAP) length === distance + 1", () => {
        const a: AxialCoord = { q: 18, r: 0 };
        const b: AxialCoord = { q: 1, r: 0 };
        const l = line(a, b, WRAP);
        expect(l.length).toBe(distance(a, b, WRAP) + 1);
      });

      it("every consecutive pair in wrapped line is at wrapped distance 1", () => {
        const a: AxialCoord = { q: 18, r: 0 };
        const b: AxialCoord = { q: 1, r: 0 };
        const l = line(a, b, WRAP);
        for (let i = 0; i < l.length - 1; i++) {
          expect(distance(l[i]!, l[i + 1]!, WRAP)).toBe(1);
        }
      });

      it("every element in wrapped line has 0 <= q < 20", () => {
        const a: AxialCoord = { q: 18, r: 0 };
        const b: AxialCoord = { q: 1, r: 0 };
        const l = line(a, b, WRAP);
        for (const c of l) {
          expect(c.q).toBeGreaterThanOrEqual(0);
          expect(c.q).toBeLessThan(20);
        }
      });
    });
  });
});
