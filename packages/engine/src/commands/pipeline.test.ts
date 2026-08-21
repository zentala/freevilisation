import { describe, it, expect } from "vitest";
import type { UnitId, HexKey } from "../ids.js";
import type { Command } from "./types.js";
import { validate, applyCommand } from "./pipeline.js";
import { P1, P2, U1, U2, makeBaseState } from "./test-fixtures.js";

describe("validate", () => {
  it("returns null for a valid MoveUnit", () => {
    const state = makeBaseState();
    const result = validate(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });
    expect(result).toBeNull();
  });

  it("rejects unknown command kind", () => {
    const state = makeBaseState();
    const badCmd = { kind: "Attack", playerId: P1 } as unknown as Command;
    const result = validate(state, badCmd);
    expect(result).not.toBeNull();
    expect(result!.code).toBe("malformed");
  });

  it("rejects when phase is not playing", () => {
    const state = makeBaseState();
    state.phase = "setup";
    const result = validate(state, { kind: "EndTurn", playerId: P1 });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("not_your_turn");
  });

  it("rejects when not the active player", () => {
    const state = makeBaseState();
    const result = validate(state, { kind: "EndTurn", playerId: P2 });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("not_your_turn");
  });

  it("rejects unknown unit", () => {
    const state = makeBaseState();
    const result = validate(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: "nonexistent" as UnitId,
      path: ["1,0" as HexKey],
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("unknown_entity");
  });

  it("rejects a player missing from the turn order", () => {
    const state = makeBaseState();
    state.playerOrder = [P2];
    const result = validate(state, { kind: "EndTurn", playerId: P1 });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("unknown_entity");
  });

  it("rejects EndTurn when the turn order is empty", () => {
    const state = makeBaseState();
    state.playerOrder = [];
    const turnBefore = state.turn;
    const result = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(result.ok).toBe(false);
    expect(state.turn).toBe(turnBefore);
  });

  it("rejects unit owned by another player", () => {
    const state = makeBaseState();
    const result = validate(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U2,
      path: ["1,2" as HexKey],
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("not_owner");
  });
});
