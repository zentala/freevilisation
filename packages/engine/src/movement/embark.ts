import type { Unit } from "../entities/Unit.js";

/** Read-only combat input exposed to E14 for an embarked unit. */
export interface EmbarkedCombatState {
  readonly isEmbarked: boolean;
  readonly combatStrengthModifier: 0;
}

/** Embarkation never grants strength; E14 applies its vulnerability rules. */
export function getEmbarkedCombatState(unit: Unit): EmbarkedCombatState {
  return { isEmbarked: unit.isEmbarked, combatStrengthModifier: 0 };
}
