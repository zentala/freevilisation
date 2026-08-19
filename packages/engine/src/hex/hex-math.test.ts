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
  });
});
