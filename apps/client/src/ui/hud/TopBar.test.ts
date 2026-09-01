import type { GameState } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import { selectTopBarValues, TopBar } from "./TopBar";

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

describe("TopBar responsive classes", () => {
  it("includes responsive gap, padding, and text size for mobile-first design", () => {
    // Verify the responsive class patterns exist in the TopBar component
    // by checking the component definition
    const topBarCode = TopBar.toString();

    // Check for responsive gap classes
    expect(topBarCode).toContain("gap-2");
    expect(topBarCode).toContain("sm:gap-4");
    // Check for responsive padding
    expect(topBarCode).toContain("px-2");
    expect(topBarCode).toContain("sm:px-4");
    // Check for responsive text size
    expect(topBarCode).toContain("text-xs");
    expect(topBarCode).toContain("sm:text-sm");
  });
});
