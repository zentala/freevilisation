import { describe, expect, it } from "vitest";
import type { ImprovementDefId } from "../ids.js";
import { applyCommand, validate } from "./pipeline.js";
import { P1, U1, U2, makeBaseState } from "./test-fixtures.js";

const IMPROVEMENT = "improvement_farm" as ImprovementDefId;

describe("unit action command skeletons", () => {
  it.each([
    ["FortifyUnit", { kind: "FortifyUnit", playerId: P1, unitId: U1 }],
    ["SleepUnit", { kind: "SleepUnit", playerId: P1, unitId: U1 }],
  ] as const)("accepts %s for an owned unit", (_name, command) => {
    const state = makeBaseState();
    expect(validate(state, command)).toBeNull();
    const result = applyCommand(state, command);
    expect(result).toEqual({ ok: true, state, events: [] });
  });

  it("accepts a build order with an improvement definition", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "BuildImprovement",
      playerId: P1,
      unitId: U1,
      improvementDefId: IMPROVEMENT,
    });
    expect(result).toEqual({ ok: true, state, events: [] });
  });

  it("rejects a build order with an empty improvement definition", () => {
    const state = makeBaseState();
    const result = validate(state, {
      kind: "BuildImprovement",
      playerId: P1,
      unitId: U1,
      improvementDefId: "" as ImprovementDefId,
    });
    expect(result).toEqual({
      code: "malformed",
      message: "Improvement definition must not be empty",
    });
  });

  it("rejects an action issued for a unit owned by another player", () => {
    const state = makeBaseState();
    const result = validate(state, {
      kind: "FortifyUnit",
      playerId: P1,
      unitId: U2,
    });
    expect(result).toEqual({ code: "not_owner", message: "Unit belongs to another player" });
  });
});
