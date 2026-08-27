import type { TechDefId } from "../ids.js";
import type { Era } from "../game-state.js";

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

const ERA_ORDER: readonly Era[] = ["Ancient", "Classical", "Medieval"];

/** Derives the highest era reached by a player's researched technologies. */
export function deriveEra(
  researchedTechs: readonly TechDefId[],
  techEra: (techDefId: TechDefId) => Era,
): Era {
  let highest = 0;
  for (const techDefId of researchedTechs) {
    const index = ERA_ORDER.indexOf(techEra(techDefId));
    if (index > highest) highest = index;
  }
  return ERA_ORDER[highest]!;
}
