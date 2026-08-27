import { describe, expect, it } from "vitest";
import type { BuildingDefId } from "../ids.js";
import { runUpkeep } from "./upkeep.js";
import { P1, U1, WARRIOR, makeBaseState } from "../commands/test-fixtures.js";

const GRANARY = "building_granary" as BuildingDefId;

describe("runUpkeep", () => {
  it("deducts unit and city building maintenance for only the target player", () => {
    const state = makeBaseState();
    state.players[P1]!.gold = 20;
    const city = {
      ownerId: P1,
      buildings: [GRANARY],
    } as (typeof state.entities.cities)[keyof typeof state.entities.cities];
    state.entities.cities["city_1" as keyof typeof state.entities.cities] = city;

    const result = runUpkeep(state, P1, {
      unitMaintenance: (unit) => (unit.defId === WARRIOR ? 3 : 0),
      buildingMaintenance: (building) => (building === GRANARY ? 4 : 0),
    });

    expect(result.state.players[P1]!.gold).toBe(13);
    expect(result.state.players["p2" as keyof typeof state.players]!.gold).toBe(0);
    expect(state.players[P1]!.gold).toBe(20);
  });

  it("invokes the E15 sell-building hook until debt is recovered", () => {
    const state = makeBaseState();
    state.players[P1]!.gold = 1;
    let calls = 0;
    const result = runUpkeep(state, P1, {
      unitMaintenance: () => 5,
      buildingMaintenance: () => 0,
      sellBuilding: (currentState, playerId) => {
        calls += 1;
        const player = currentState.players[playerId]!;
        return {
          state: {
            ...currentState,
            players: {
              ...currentState.players,
              [playerId]: Object.assign(
                Object.create(Object.getPrototypeOf(player)) as typeof player,
                player,
                { gold: player.gold + 2 },
              ),
            },
          },
          events: [],
        };
      },
    });

    expect(calls).toBe(2);
    expect(result.state.players[P1]!.gold).toBe(0);
  });

  it("does not call the bankruptcy hook when gold remains non-negative", () => {
    const state = makeBaseState();
    state.players[P1]!.gold = 10;
    let calls = 0;
    runUpkeep(state, P1, {
      unitMaintenance: () => 1,
      buildingMaintenance: () => 0,
      sellBuilding: (currentState) => {
        calls += 1;
        return { state: currentState, events: [] };
      },
    });
    expect(calls).toBe(0);
  });

  it("returns the same state for an unknown player", () => {
    const state = makeBaseState();
    const result = runUpkeep(state, "missing" as typeof P1, {
      unitMaintenance: () => 100,
      buildingMaintenance: () => 100,
    });
    expect(result.state).toBe(state);
  });
});
