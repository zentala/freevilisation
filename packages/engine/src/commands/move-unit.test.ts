import { describe, it, expect } from "vitest";
import type { HexKey } from "../ids.js";
import { applyCommand } from "./pipeline.js";
import { P1, U1, makeBaseState } from "./test-fixtures.js";

describe("applyCommand — MoveUnit", () => {
  it("moves a unit and emits UnitMoved event", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    const moved = result.state.entities.units[U1]!;
    expect(moved.coord).toBe("1,0");
    expect(moved.movesLeft).toBe(2);
    expect(result.events).toEqual([
      { kind: "UnitMoved", unitId: U1, from: "0,0", to: "1,0", movesRemaining: 2 },
    ]);
  });

  it("does not mutate the input state", () => {
    const state = makeBaseState();
    const origUnits = state.entities.units;
    applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });
    expect(state.entities.units).toBe(origUnits);
    expect(state.entities.units[U1]!.coord).toBe("0,0");
  });

  it("moves the unit id between tile occupant lists", () => {
    const state = makeBaseState();
    state.map.tiles["0,0" as HexKey]!.occupantUnitIds = [U1];

    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.map.tiles["0,0" as HexKey]!.occupantUnitIds).toEqual([]);
    expect(result.state.map.tiles["1,0" as HexKey]!.occupantUnitIds).toEqual([U1]);
    expect(state.map.tiles["0,0" as HexKey]!.occupantUnitIds).toEqual([U1]);
  });

  it("returns a new state object", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state).not.toBe(state);
  });

  it("input units and cities records are unchanged after MoveUnit", () => {
    const state = makeBaseState();
    const origUnits = state.entities.units;
    const origCities = state.entities.cities;
    applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });
    expect(state.entities.units).toBe(origUnits);
    expect(state.entities.cities).toBe(origCities);
  });
});

describe("applyCommand — MoveUnit rejections", () => {
  it("rejects MoveUnit with empty path", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("malformed");
  });

  it("rejects MoveUnit to unknown tile", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["99,99" as HexKey],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("illegal");
  });

  it("carries unaffordable trailing steps as a move order", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey, "2,0" as HexKey, "2,1" as HexKey, "2,2" as HexKey],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected move");
    expect(result.state.entities.units[U1]!.coord).toBe("2,1");
    expect(result.state.entities.units[U1]!.movesLeft).toBe(0);
    expect(result.state.entities.units[U1]!.moveOrder).toEqual(["2,2"]);
  });

  it("rejects MoveUnit to a distant hex named as the sole path entry (no teleporting)", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["2,2" as HexKey],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("illegal");
  });

  it("rejects MoveUnit whose first step is not adjacent to the unit's coord", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["2,0" as HexKey],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("illegal");
  });

  it("rejects MoveUnit whose second step is not adjacent to its first", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey, "2,2" as HexKey],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.reason.code).toBe("illegal");
  });

  it("accepts a legal multi-step contiguous path and charges one move per step", () => {
    const state = makeBaseState();
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey, "2,0" as HexKey],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    const moved = result.state.entities.units[U1]!;
    expect(moved.coord).toBe("2,0");
    expect(moved.movesLeft).toBe(1);
  });

  it("accepts a MoveUnit step that wraps across the east/west seam on a wraparound map", () => {
    const state = makeBaseState();
    state.map = { ...state.map, isWraparoundX: true, width: 3 };
    const result = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["2,0" as HexKey],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.entities.units[U1]!.coord).toBe("2,0");
  });
});
