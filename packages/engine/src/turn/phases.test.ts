import { describe, expect, it } from "vitest";
import { advancePhase, deriveEra, TURN_PHASES, type TurnPhase } from "./phases.js";
import type { TechDefId } from "../ids.js";

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

describe("deriveEra", () => {
  const eras = new Map<TechDefId, "Ancient" | "Classical" | "Medieval">([
    ["tech_a" as TechDefId, "Ancient"],
    ["tech_c" as TechDefId, "Classical"],
    ["tech_m" as TechDefId, "Medieval"],
  ]);

  it("returns Ancient when no technology has been researched", () => {
    expect(deriveEra([], (tech) => eras.get(tech)!)).toBe("Ancient");
  });

  it("returns the highest era among researched technologies", () => {
    expect(
      deriveEra(["tech_a", "tech_m", "tech_c"] as TechDefId[], (tech) => eras.get(tech)!),
    ).toBe("Medieval");
  });

  it("does not depend on research order", () => {
    expect(deriveEra(["tech_c", "tech_a"] as TechDefId[], (tech) => eras.get(tech)!)).toBe(
      "Classical",
    );
  });
});
