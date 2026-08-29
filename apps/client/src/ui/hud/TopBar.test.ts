import type { GameState } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import { selectTopBarValues } from "./TopBar";

describe("selectTopBarValues", () => {
  it("derives turn and yields from the active player", () => {
    const state = {
      turn: 7,
      activePlayerId: "p1",
      players: { p1: { gold: 42, goldPerTurn: 5, culturePerTurn: 3 } },
    } as unknown as GameState;
    expect(selectTopBarValues(state)).toEqual({
      turn: 7,
      gold: 42,
      goldPerTurn: 5,
      sciencePerTurn: 0,
      culturePerTurn: 3,
    });
  });

  it("returns safe zero values before a game snapshot is available", () => {
    expect(selectTopBarValues(null)).toEqual({
      turn: 0,
      gold: 0,
      goldPerTurn: 0,
      sciencePerTurn: 0,
      culturePerTurn: 0,
    });
  });
});
