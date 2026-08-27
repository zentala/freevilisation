import { describe, expect, it } from "vitest";
import type { HexKey, TerrainDefId } from "../ids.js";
import { makeBaseState, U1 } from "../commands/test-fixtures.js";
import { getEmbarkedCombatState } from "./embark.js";
import { stepCost } from "./step.js";

describe("embark movement contract", () => {
  it("charges one movement point to enter water and disembark on land", () => {
    const state = makeBaseState();
    state.map.tiles["1,0" as HexKey]!.terrainDefId = "terrain_ocean" as TerrainDefId;
    const unit = state.entities.units[U1]!;

    expect(stepCost(state, U1, "0,0" as HexKey, "1,0" as HexKey)).toBe(1);
    unit.isEmbarked = true;
    expect(stepCost(state, U1, "1,0" as HexKey, "0,0" as HexKey)).toBe(1);
  });

  it("does not allow a non-embarked unit to cross water", () => {
    const state = makeBaseState();
    state.map.tiles["1,0" as HexKey]!.terrainDefId = "terrain_ocean" as TerrainDefId;
    state.map.tiles["2,0" as HexKey]!.terrainDefId = "terrain_ocean" as TerrainDefId;

    expect(stepCost(state, U1, "1,0" as HexKey, "2,0" as HexKey)).toBe(Number.POSITIVE_INFINITY);
  });

  it("exposes the embarked flag and flat zero strength modifier to combat", () => {
    const state = makeBaseState();
    const unit = state.entities.units[U1]!;
    expect(getEmbarkedCombatState(unit)).toEqual({ isEmbarked: false, combatStrengthModifier: 0 });
    unit.isEmbarked = true;
    expect(getEmbarkedCombatState(unit)).toEqual({ isEmbarked: true, combatStrengthModifier: 0 });
  });
});
