import { describe, expect, it } from "vitest";
import { applyCommand } from "../commands/pipeline.js";
import { P1, makeBaseState } from "../commands/test-fixtures.js";
import { autosaveCommand } from "./autosave.js";

describe("autosaveCommand", () => {
  it("creates a SaveGame command on each configured interval", () => {
    const state = makeBaseState();
    state.turn = 4;
    state.settings.autosaveInterval = 2;
    expect(autosaveCommand(state, P1)).toEqual({
      kind: "SaveGame",
      playerId: P1,
      label: "autosave-turn-4",
    });
  });

  it("does not create a command between intervals or when disabled", () => {
    const state = makeBaseState();
    state.turn = 3;
    state.settings.autosaveInterval = 2;
    expect(autosaveCommand(state, P1)).toBeNull();
    state.settings.autosaveInterval = null;
    expect(autosaveCommand(state, P1)).toBeNull();
  });

  it("SaveGame is a valid non-mutating command-log entry", () => {
    const state = makeBaseState();
    state.activePlayerId = P1;
    const result = applyCommand(state, { kind: "SaveGame", playerId: P1, label: "manual" });
    expect(result).toEqual({ ok: true, state, events: [] });
  });
});
