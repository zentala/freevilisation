/** Ordered phases that make up one gameplay turn. */
export type TurnPhase = "upkeep" | "commands" | "combat" | "growth" | "research" | "end";

/** Canonical phase order from upkeep through end turn. */
export const TURN_PHASES = [
  "upkeep",
  "commands",
  "combat",
  "growth",
  "research",
  "end",
] as const satisfies readonly TurnPhase[];

/**
 * Returns the phase after `phase`, wrapping from end turn to the next upkeep.
 * The function is pure so the same phase always produces the same result.
 */
export function advancePhase(phase: TurnPhase): TurnPhase {
  const index = TURN_PHASES.indexOf(phase);
  return TURN_PHASES[(index + 1) % TURN_PHASES.length]!;
}
