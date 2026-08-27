/** A unit's movement budget, measured in movement points. */
export type MovementPoints = number;

export interface MovementBudget {
  readonly movesLeft: MovementPoints;
  readonly movesMax: MovementPoints;
}

/** Creates a full movement budget for a unit at the start of its turn. */
export function createMovementBudget(movesMax: MovementPoints): MovementBudget {
  assertMovementPoints(movesMax, "movesMax");
  return { movesLeft: movesMax, movesMax };
}

/** Returns whether a budget can pay a movement cost without going negative. */
export function canSpendMovement(
  budget: MovementBudget,
  cost: MovementPoints,
): boolean {
  assertBudget(budget);
  assertMovementPoints(cost, "cost");
  return cost <= budget.movesLeft;
}

/** Spends a cost from a budget, returning null when the cost is unaffordable. */
export function spendMovement(
  budget: MovementBudget,
  cost: MovementPoints,
): MovementBudget | null {
  if (!canSpendMovement(budget, cost)) return null;
  return { movesLeft: budget.movesLeft - cost, movesMax: budget.movesMax };
}

function assertBudget(budget: MovementBudget): void {
  assertMovementPoints(budget.movesMax, "movesMax");
  assertMovementPoints(budget.movesLeft, "movesLeft");
  if (budget.movesLeft > budget.movesMax) {
    throw new Error("movesLeft must not exceed movesMax");
  }
}

function assertMovementPoints(value: MovementPoints, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
}
