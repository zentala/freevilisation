import { describe, expect, it } from "vitest";
import type { TechDefId } from "../ids.js";
import { P1, makeBaseState } from "../commands/test-fixtures.js";
import { runResearch } from "./research.js";

const TECH = "tech_writing" as TechDefId;

describe("runResearch", () => {
  it("applies science to the active research without mutating input", () => {
    const state = makeBaseState();
    state.players[P1]!.currentResearch = { techDefId: TECH, scienceInvested: 2 };

    const result = runResearch(state, P1, {
      sciencePerTurn: () => 3,
      techCost: () => 10,
    });

    expect(result.state.players[P1]!.currentResearch).toEqual({
      techDefId: TECH,
      scienceInvested: 5,
    });
    expect(result.state.players[P1]!.needsNextTech).toBe(false);
    expect(state.players[P1]!.currentResearch?.scienceInvested).toBe(2);
    expect(result.events).toEqual([]);
  });

  it("emits TechResearched and requests the next technology on completion", () => {
    const state = makeBaseState();
    state.players[P1]!.currentResearch = { techDefId: TECH, scienceInvested: 8 };

    const result = runResearch(state, P1, {
      sciencePerTurn: () => 3,
      techCost: () => 10,
    });

    expect(result.state.players[P1]!.researchedTechs).toEqual([TECH]);
    expect(result.state.players[P1]!.currentResearch).toBeNull();
    expect(result.state.players[P1]!.needsNextTech).toBe(true);
    expect(result.events).toEqual([{ kind: "TechResearched", playerId: P1, techDefId: TECH }]);
  });

  it("flags a player without a selected technology", () => {
    const state = makeBaseState();
    const result = runResearch(state, P1, {
      sciencePerTurn: () => 10,
      techCost: () => 10,
    });

    expect(result.state.players[P1]!.needsNextTech).toBe(true);
    expect(result.events).toEqual([]);
  });

  it("returns the same state for an unknown player", () => {
    const state = makeBaseState();
    const result = runResearch(state, "missing" as typeof P1);
    expect(result.state).toBe(state);
  });
});
