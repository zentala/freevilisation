import { describe, it, expect } from "vitest";
import { hashLattice, valueNoise2D, fractalNoise2D } from "./noise.js";

describe("hashLattice", () => {
  it("returns a value in [0, 1) for a spread of inputs including negatives and zero", () => {
    const inputs: Array<[number, number, number]> = [
      [0, 0, 0],
      [1, -1, 42],
      [-5, 3, 100],
      [999, 999, -1],
      [-100, -200, 555],
    ];
    for (const [ix, iy, seed] of inputs) {
      const v = hashLattice(ix, iy, seed);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic — same inputs always return the same output", () => {
    const a = hashLattice(3, 7, 42);
    const b = hashLattice(3, 7, 42);
    expect(a).toBe(b);
  });

  it("changing any one of ix, iy, seed changes the output (spot check)", () => {
    const base = hashLattice(10, 20, 30);
    expect(hashLattice(11, 20, 30)).not.toBe(base);
    expect(hashLattice(10, 21, 30)).not.toBe(base);
    expect(hashLattice(10, 20, 31)).not.toBe(base);
  });
});

describe("valueNoise2D", () => {
  it("output stays in [0, 1) across a grid of sample points", () => {
    for (let x = -5; x <= 5; x += 0.7) {
      for (let y = -5; y <= 5; y += 0.7) {
        const v = valueNoise2D(x, y, 42);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it("is deterministic across repeated calls", () => {
    const a = valueNoise2D(2.5, 3.7, 99);
    const b = valueNoise2D(2.5, 3.7, 99);
    expect(a).toBe(b);
  });

  it("different seeds produce different values for at least one sampled point", () => {
    let foundDifference = false;
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (valueNoise2D(x, y, 1) !== valueNoise2D(x, y, 2)) {
          foundDifference = true;
          break;
        }
      }
      if (foundDifference) break;
    }
    expect(foundDifference).toBe(true);
  });
});

describe("fractalNoise2D", () => {
  it("output stays in [0, 1) across sample points and parameter combos", () => {
    const combos: Array<[number, number]> = [
      [4, 0.5],
      [3, 0.6],
      [6, 0.4],
    ];
    for (const [octaves, persistence] of combos) {
      for (let x = -3; x <= 3; x += 1.3) {
        for (let y = -3; y <= 3; y += 1.3) {
          const v = fractalNoise2D(x, y, 42, octaves, persistence, 2);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(1);
        }
      }
    }
  });

  it("throws when octaves <= 0", () => {
    expect(() => fractalNoise2D(0, 0, 0, 0, 0.5, 2)).toThrow("octaves");
    expect(() => fractalNoise2D(0, 0, 0, -1, 0.5, 2)).toThrow("octaves");
  });
});
