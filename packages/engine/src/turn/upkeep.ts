import type { GameState } from "../game-state.js";
import type { GameEvent } from "../commands/types.js";
import type { BuildingDefId, PlayerId } from "../ids.js";
import type { Unit } from "../entities/Unit.js";
import type { City } from "../entities/City.js";
import { Player } from "../entities/Player.js";

export interface UpkeepRules {
  readonly unitMaintenance: (unit: Unit) => number;
  readonly buildingMaintenance: (buildingDefId: BuildingDefId, city: City) => number;
  /** E15 supplies this hook to sell one cheapest eligible building. */
  readonly sellBuilding?: (state: GameState, playerId: PlayerId) => UpkeepResult;
}

export interface UpkeepResult {
  readonly state: GameState;
  readonly events: GameEvent[];
}

const NO_MAINTENANCE: UpkeepRules = {
  unitMaintenance: () => 0,
  buildingMaintenance: () => 0,
};

function replacePlayerGold(player: Player, gold: number): Player {
  return new Player(
    player.id,
    player.createdTurn,
    player.civDefId,
    player.isAI,
    player.isBarbarian,
    gold,
    player.goldPerTurn,
    player.researchedTechs,
    player.adoptedPolicies,
    player.culturePerTurn,
    player.cultureStock,
    player.capitalCityId,
    player.isAlive,
    player.eliminatedTurn,
  );
}

function maintenanceForPlayer(state: GameState, playerId: PlayerId, rules: UpkeepRules): number {
  const unitCost = Object.values(state.entities.units)
    .filter((unit) => unit.ownerId === playerId)
    .reduce((total, unit) => total + rules.unitMaintenance(unit), 0);
  const buildingCost = Object.values(state.entities.cities)
    .filter((city) => city.ownerId === playerId)
    .flatMap((city) => city.buildings.map((id) => rules.buildingMaintenance(id, city)))
    .reduce((total, cost) => total + cost, 0);
  return unitCost + buildingCost;
}

/** Applies one player's upkeep and delegates bankruptcy recovery to E15. */
export function runUpkeep(
  state: GameState,
  playerId: PlayerId,
  rules: UpkeepRules = NO_MAINTENANCE,
): UpkeepResult {
  const player = state.players[playerId];
  if (!player) return { state, events: [] };

  const maintenance = maintenanceForPlayer(state, playerId, rules);
  let currentState: GameState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: replacePlayerGold(player, player.gold - maintenance),
    },
  };
  const events: GameEvent[] = [];

  while (rules.sellBuilding && (currentState.players[playerId]?.gold ?? 0) < 0) {
    const beforeGold = currentState.players[playerId]?.gold;
    const result = rules.sellBuilding(currentState, playerId);
    currentState = result.state;
    events.push(...result.events);
    if (currentState.players[playerId]?.gold === beforeGold) break;
  }

  return { state: currentState, events };
}
