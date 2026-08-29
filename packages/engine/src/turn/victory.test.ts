import { describe, expect, it } from "vitest";
import type { DefId } from "../ids.js";
import { P1, makeBaseState } from "../commands/test-fixtures.js";
import { resolveVictory } from "./victory.js";

const VICTORY = "victory_domination" as DefId<"victory">;

describe("resolveVictory", () => {
  it("leaves the state in playing when no victory is found", () => {
    const state = makeBaseState();
    const result = resolveVictory(state, () => null);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it("marks game over and emits GameOver for a winning result", () => {
    const state = makeBaseState();
    const result = resolveVictory(state, () => ({
      winnerPlayerId: P1,
      victoryType: VICTORY,
    }));

    expect(result.state.phase).toBe("game_over");
    expect(result.state.winnerPlayerId).toBe(P1);
    expect(result.state.victoryType).toBe(VICTORY);
    expect(result.events).toEqual([{ kind: "GameOver", winnerPlayerId: P1, victoryType: VICTORY }]);
    expect(state.phase).toBe("playing");
  });

  it("passes the fully resolved state to the checker", () => {
    const state = makeBaseState();
    let checked: typeof state | undefined;
    resolveVictory(state, (resolved) => {
      checked = resolved;
      return null;
    });
    expect(checked).toBe(state);
  });
});
