import { describe, expect, it } from "vitest";

describe("determinism gate verification (throwaway)", () => {
  it("deliberately fails to prove the CI gate catches it", () => {
    expect(1).toBe(2);
  });
});
