import { describe, expect, it } from "vitest";
import { getAvailableUnitActions, type UnitDefForActions } from "./UnitActionsPanel";

describe("getAvailableUnitActions", () => {
  it("preserves definition order while removing duplicate orders", () => {
    const def: UnitDefForActions = {
      id: "warrior",
      effects: ["melee"],
      availableOrders: ["move", "attack", "move", "fortify"],
    };

    expect(getAvailableUnitActions(def)).toEqual(["move", "attack", "fortify"]);
  });
});
