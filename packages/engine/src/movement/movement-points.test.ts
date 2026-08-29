import { describe, expect, it } from "vitest";
import { canSpendMovement, createMovementBudget, spendMovement } from "./movement-points.js";

describe("movement points", () => {
  it("starts a unit with a full budget", () => {
    expect(createMovementBudget(2.5)).toEqual({ movesLeft: 2.5, movesMax: 2.5 });
  });

  it("spends fractional costs without losing precision by rounding", () => {
    const budget = createMovementBudget(3);
    expect(spendMovement(budget, 1.25)).toEqual({ movesLeft: 1.75, movesMax: 3 });
  });

  it("rejects a cost larger than the remaining budget", () => {
    const budget = createMovementBudget(1);
    expect(canSpendMovement(budget, 1.01)).toBe(false);
    expect(spendMovement(budget, 1.01)).toBeNull();
  });

  it("rejects invalid budgets and costs", () => {
    expect(() => createMovementBudget(-1)).toThrow("movesMax");
    expect(() => spendMovement(createMovementBudget(1), Number.NaN)).toThrow("cost");
    expect(() => canSpendMovement({ movesLeft: 2, movesMax: 1 }, 1)).toThrow("movesLeft");
  });
});
