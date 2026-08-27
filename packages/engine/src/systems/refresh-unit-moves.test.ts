import { describe, expect, it } from "vitest";
import { P1, U1, makeBaseState } from "../commands/test-fixtures.js";
import { refreshUnitMoves } from "./refresh-unit-moves.js";

describe("refreshUnitMoves", () => {
  it("resets each owned unit to its movesMax", () => {
    const state = makeBaseState();
    state.entities.units[U1]!.movesLeft = 1;

    const result = refreshUnitMoves(state, P1);

    expect(result.state.entities.units[U1]!.movesLeft).toBe(3);
    expect(result.state.entities.units[U1]!.movesMax).toBe(3);
  });

  it("applies the movesMax modifier hook before resetting movesLeft", () => {
    const state = makeBaseState();
    state.entities.units[U1]!.movesLeft = 0;

    const result = refreshUnitMoves(state, P1, (_state, unit) => unit.movesMax + 1);

    expect(result.state.entities.units[U1]!.movesMax).toBe(4);
    expect(result.state.entities.units[U1]!.movesLeft).toBe(4);
  });

  it("rejects an invalid movesMax modifier result", () => {
    const state = makeBaseState();
    expect(() => refreshUnitMoves(state, P1, () => -1)).toThrow("movesMax modifier");
  });
});
