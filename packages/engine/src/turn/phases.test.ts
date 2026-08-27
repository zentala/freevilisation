import { describe, expect, it } from "vitest";
import { advancePhase, TURN_PHASES, type TurnPhase } from "./phases.js";

describe("turn phases", () => {
  it("defines the gameplay phases in the documented order", () => {
    expect(TURN_PHASES).toEqual(["upkeep", "commands", "combat", "growth", "research", "end"]);
  });

  it.each([
    ["upkeep", "commands"],
    ["commands", "combat"],
    ["combat", "growth"],
    ["growth", "research"],
    ["research", "end"],
    ["end", "upkeep"],
  ] as const)("advances %s to %s", (current, next) => {
    expect(advancePhase(current)).toBe(next);
  });

  it("does not mutate the phase sequence", () => {
    const before = [...TURN_PHASES];
    const phases: TurnPhase[] = ["upkeep", "commands", "combat", "growth", "research", "end"];

    for (const phase of phases) advancePhase(phase);

    expect(TURN_PHASES).toEqual(before);
  });
});
