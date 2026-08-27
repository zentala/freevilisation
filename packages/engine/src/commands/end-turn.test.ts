import { describe, it, expect } from "vitest";
import type { HexKey } from "../ids.js";
import { applyCommand } from "./pipeline.js";
import { P1, P2, U1, U2, makeBaseState } from "./test-fixtures.js";

describe("applyCommand — EndTurn", () => {
  it("advances to the next player", () => {
    const state = makeBaseState();
    const result = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.activePlayerId).toBe(P2);
    expect(result.state.turn).toBe(1);
  });

  it("wraps past the last player and increments turn", () => {
    const state = makeBaseState();
    state.activePlayerId = P2;
    const result = applyCommand(state, { kind: "EndTurn", playerId: P2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.activePlayerId).toBe(P1);
    expect(result.state.turn).toBe(2);
  });

  it("emits TurnEnded then TurnStarted events", () => {
    const state = makeBaseState();
    const result = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.events).toEqual([
      { kind: "TurnEnded", turn: 1, activePlayerId: P1 },
      { kind: "TurnStarted", turn: 1, activePlayerId: P2 },
    ]);
  });

  it("wrapping emits correct turn numbers", () => {
    const state = makeBaseState();
    state.activePlayerId = P2;
    const result = applyCommand(state, { kind: "EndTurn", playerId: P2 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.events).toEqual([
      { kind: "TurnEnded", turn: 1, activePlayerId: P2 },
      { kind: "TurnStarted", turn: 2, activePlayerId: P1 },
    ]);
  });

  it("input units and cities records are unchanged after EndTurn", () => {
    const state = makeBaseState();
    const origUnits = state.entities.units;
    const origCities = state.entities.cities;
    applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(state.entities.units).toBe(origUnits);
    expect(state.entities.cities).toBe(origCities);
  });
});

describe("EndTurn — turn boundary", () => {
  it("move → EndTurn → move again succeeds (regression)", () => {
    let state = makeBaseState();

    const move1 = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });
    expect(move1.ok).toBe(true);
    if (!move1.ok) throw new Error("expected ok");
    state = move1.state;

    const endP1 = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(endP1.ok).toBe(true);
    if (!endP1.ok) throw new Error("expected ok");
    state = endP1.state;

    const endP2 = applyCommand(state, { kind: "EndTurn", playerId: P2 });
    expect(endP2.ok).toBe(true);
    if (!endP2.ok) throw new Error("expected ok");
    state = endP2.state;

    const move2 = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["2,0" as HexKey],
    });
    expect(move2.ok).toBe(true);
    if (!move2.ok) throw new Error("expected ok");
    expect(move2.state.entities.units[U1]!.coord).toBe("2,0");
    expect(move2.state.entities.units[U1]!.movesLeft).toBe(2);
  });

  it("refreshUnitMoves restores only the starting player's units", () => {
    let state = makeBaseState();

    const move1 = applyCommand(state, {
      kind: "MoveUnit",
      playerId: P1,
      unitId: U1,
      path: ["1,0" as HexKey],
    });
    expect(move1.ok).toBe(true);
    if (!move1.ok) throw new Error("expected ok");
    state = move1.state;

    const endP1 = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(endP1.ok).toBe(true);
    if (!endP1.ok) throw new Error("expected ok");
    state = endP1.state;

    expect(state.entities.units[U1]!.movesLeft).toBe(2);
    expect(state.entities.units[U2]!.movesLeft).toBe(3);
  });

  it("returned state always has phase 'playing'", () => {
    const state = makeBaseState();
    const result = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.state.phase).toBe("playing");
  });
});

describe("EndTurn — simultaneous turns", () => {
  it("waits for every player before resolving a turn", () => {
    const state = makeBaseState();
    state.settings.simultaneousTurns = true;

    const first = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected ok");
    expect(first.state.turn).toBe(state.turn);
    expect(first.state.phase).toBe("playing");
    expect(first.state.activePlayerId).toBeNull();
    expect(first.state.submittedEndTurnPlayerIds).toEqual([P1]);
    expect(first.events).toEqual([]);
  });

  it("resolves once all players submit and resets the submission set", () => {
    const state = makeBaseState();
    state.settings.simultaneousTurns = true;

    const first = applyCommand(state, { kind: "EndTurn", playerId: P1 });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected ok");
    const second = applyCommand(first.state, { kind: "EndTurn", playerId: P2 });
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("expected ok");

    expect(second.state.turn).toBe(state.turn + 1);
    expect(second.state.activePlayerId).toBeNull();
    expect(second.state.submittedEndTurnPlayerIds).toEqual([]);
    expect(second.events[0]).toEqual({ kind: "TurnEnded", turn: state.turn, activePlayerId: null });
    expect(second.events.at(-1)).toEqual({
      kind: "TurnStarted",
      turn: state.turn + 1,
      activePlayerId: null,
    });
  });

  it("keeps simultaneous submissions deterministic regardless of arrival order", () => {
    const state = makeBaseState();
    state.settings.simultaneousTurns = true;
    const first = applyCommand(state, { kind: "EndTurn", playerId: P2 });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected ok");
    const second = applyCommand(first.state, { kind: "EndTurn", playerId: P1 });
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error("expected ok");
    expect(second.state.turn).toBe(state.turn + 1);
    expect(second.state.submittedEndTurnPlayerIds).toEqual([]);
  });
});
