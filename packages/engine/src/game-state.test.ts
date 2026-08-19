import { describe, it, expect } from "vitest";
import { createInitialGameState } from "./game-state.js";
import { Registry } from "./registry.js";
import type { GameSettings } from "./game-state.js";

const EMPTY_REGISTRY = Registry.load({
  units: [],
  buildings: [],
  terrains: [],
  techs: [],
  civs: [],
});

const DEFAULT_SETTINGS: GameSettings = {
  mapSeed: 42,
  mapSize: "small",
  victoryConditions: [],
  difficulty: "settler" as GameSettings["difficulty"],
  turnTimerSeconds: null,
  simultaneousTurns: false,
};

const DEFAULT_RULESET_REF = {
  id: "base",
  version: "0.1.0",
  contentHash: "abc123",
};

describe("createInitialGameState", () => {
  it("returns correct initial state", () => {
    const state = createInitialGameState(42, DEFAULT_SETTINGS, EMPTY_REGISTRY, DEFAULT_RULESET_REF);
    expect(state.turn).toBe(0);
    expect(state.phase).toBe("setup");
    expect(state.activePlayerId).toBeNull();
    expect(state.players).toEqual({});
    expect(state.playerOrder).toEqual([]);
    expect(state.winnerPlayerId).toBeNull();
    expect(state.victoryType).toBeNull();
    expect(state.map.width).toBe(30);
    expect(state.map.height).toBe(30);
    expect(state.map.tiles).toEqual({});
    expect(state.entities.units).toEqual({});
    expect(state.entities.cities).toEqual({});
  });

  it("mapSize lookup works for all sizes", () => {
    const cases: Array<[GameSettings["mapSize"], number, number]> = [
      ["tiny", 20, 20],
      ["small", 30, 30],
      ["standard", 44, 44],
      ["large", 60, 60],
      ["huge", 80, 80],
    ];

    for (const [size, w, h] of cases) {
      const state = createInitialGameState(
        1,
        { ...DEFAULT_SETTINGS, mapSize: size },
        EMPTY_REGISTRY,
        DEFAULT_RULESET_REF,
      );
      expect(state.map.width).toBe(w);
      expect(state.map.height).toBe(h);
    }
  });

  it("rngState uses mulberry32 algorithm", () => {
    const state = createInitialGameState(42, DEFAULT_SETTINGS, EMPTY_REGISTRY, DEFAULT_RULESET_REF);
    expect(state.rngState.algorithm).toBe("mulberry32");
    expect(state.rngState.drawCount).toBe(0);
  });

  it("same seed produces same rngState", () => {
    const a = createInitialGameState(42, DEFAULT_SETTINGS, EMPTY_REGISTRY, DEFAULT_RULESET_REF);
    const b = createInitialGameState(42, DEFAULT_SETTINGS, EMPTY_REGISTRY, DEFAULT_RULESET_REF);
    expect(a.rngState.state).toBe(b.rngState.state);
  });

  it("nextEntitySeq starts at 0", () => {
    const state = createInitialGameState(42, DEFAULT_SETTINGS, EMPTY_REGISTRY, DEFAULT_RULESET_REF);
    expect(state.nextEntitySeq).toBe(0);
  });
});
