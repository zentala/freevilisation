import { describe, it, expect } from "vitest";
import type { HexKey } from "../ids.js";
import type { AxialCoord } from "./coords.js";
import {
  toHexKey,
  fromHexKey,
  cubeS,
  coordsEqual,
} from "./coords.js";

describe("coords", () => {
  describe("toHexKey / fromHexKey round-trip", () => {
    it("round-trips (0,0)", () => {
      const coord: AxialCoord = { q: 0, r: 0 };
      expect(fromHexKey(toHexKey(coord))).toEqual(coord);
    });

    it("round-trips positive coordinates", () => {
      const coord: AxialCoord = { q: 3, r: -2 };
      expect(fromHexKey(toHexKey(coord))).toEqual(coord);
    });

    it("round-trips negative coordinates", () => {
      const coord: AxialCoord = { q: -5, r: 7 };
      expect(fromHexKey(toHexKey(coord))).toEqual(coord);
    });

    it("produces correct string format", () => {
      expect(toHexKey({ q: 2, r: -3 })).toBe("2,-3" as HexKey);
      expect(toHexKey({ q: 0, r: 0 })).toBe("0,0" as HexKey);
    });
  });

  describe("fromHexKey validation", () => {
    it("throws on a non-numeric string", () => {
      expect(() => fromHexKey("abc" as HexKey)).toThrow("Malformed HexKey");
    });

    it("throws on a single value", () => {
      expect(() => fromHexKey("1" as HexKey)).toThrow("Malformed HexKey");
    });

    it("throws on three comma-separated values", () => {
      expect(() => fromHexKey("1,2,3" as HexKey)).toThrow("Malformed HexKey");
    });

    it("throws on empty string", () => {
      expect(() => fromHexKey("" as HexKey)).toThrow("Malformed HexKey");
    });

    it("throws on fractional q", () => {
      expect(() => fromHexKey("1.5,2" as HexKey)).toThrow("Malformed HexKey");
    });

    it("throws on fractional r", () => {
      expect(() => fromHexKey("1,2.5" as HexKey)).toThrow("Malformed HexKey");
    });

    it("throws on negative fractional key", () => {
      expect(() => fromHexKey("-1.5,-2" as HexKey)).toThrow("Malformed HexKey");
    });
  });

  describe("cubeS", () => {
    it("satisfies q + r + s === 0 for (0,0)", () => {
      const c: AxialCoord = { q: 0, r: 0 };
      expect(c.q + c.r + cubeS(c)).toBe(0);
    });

    it("satisfies q + r + s === 0 for positive q", () => {
      const c: AxialCoord = { q: 3, r: -1 };
      expect(c.q + c.r + cubeS(c)).toBe(0);
    });

    it("satisfies q + r + s === 0 for negative r", () => {
      const c: AxialCoord = { q: -2, r: -5 };
      expect(c.q + c.r + cubeS(c)).toBe(0);
    });

    it("satisfies q + r + s === 0 for large values", () => {
      const c: AxialCoord = { q: 100, r: -200 };
      expect(c.q + c.r + cubeS(c)).toBe(0);
    });
  });

  describe("coordsEqual", () => {
    it("returns true for identical coordinates", () => {
      expect(coordsEqual({ q: 1, r: 2 }, { q: 1, r: 2 })).toBe(true);
    });

    it("returns false when q differs", () => {
      expect(coordsEqual({ q: 1, r: 2 }, { q: 2, r: 2 })).toBe(false);
    });

    it("returns false when r differs", () => {
      expect(coordsEqual({ q: 1, r: 2 }, { q: 1, r: 3 })).toBe(false);
    });

    it("returns true for both negative", () => {
      expect(coordsEqual({ q: -3, r: -4 }, { q: -3, r: -4 })).toBe(true);
    });
  });
});
