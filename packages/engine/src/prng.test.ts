import { describe, it, expect } from "vitest";
import { createPrng, restorePrng } from "./prng.js";

describe("Prng", () => {
  it("determinism: same seed produces identical sequences", () => {
    const a = createPrng(42);
    const b = createPrng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("next() returns floats in [0, 1)", () => {
    const rng = createPrng(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("drawCount increments on each next() call", () => {
    const rng = createPrng(1);
    expect(rng.state().drawCount).toBe(0);
    rng.next();
    expect(rng.state().drawCount).toBe(1);
    rng.next();
    expect(rng.state().drawCount).toBe(2);
  });

  it("fork determinism: same label produces identical child streams", () => {
    const rootA = createPrng(42);
    const rootB = createPrng(42);
    const childA = rootA.fork("combat");
    const childB = rootB.fork("combat");
    expect(childA.next()).toBe(childB.next());
  });

  it("fork with different labels produces different streams", () => {
    const root = createPrng(42);
    const childA = root.fork("combat");
    const childB = root.fork("explore");
    expect(childA.next()).not.toBe(childB.next());
  });

  it("state round-trip: restorePrng reproduces state", () => {
    const rng = createPrng(42);
    rng.next();
    rng.next();
    rng.next();
    const snap = rng.state();
    const restored = restorePrng(snap);
    const originalNext = rng.next();
    const restoredNext = restored.next();
    expect(restoredNext).toBe(originalNext);
  });

  it("state snapshot is JSON-serializable", () => {
    const rng = createPrng(42);
    rng.next();
    const snap = rng.state();
    const json = JSON.stringify(snap);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(snap);
  });
});
