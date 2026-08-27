import type { GameState } from "../game-state.js";
import type { GameEvent } from "../commands/types.js";
import type { Player } from "../entities/Player.js";
import type { PlayerId, TechDefId } from "../ids.js";
import { Player as PlayerEntity } from "../entities/Player.js";

export interface ResearchRules {
  readonly sciencePerTurn: (state: GameState, player: Player) => number;
  readonly techCost: (techDefId: TechDefId) => number;
}

export interface ResearchResult {
  readonly state: GameState;
  readonly events: GameEvent[];
}

const DEFAULT_RESEARCH: ResearchRules = {
  sciencePerTurn: () => 0,
  techCost: () => Number.POSITIVE_INFINITY,
};

function copyPlayer(player: Player): Player {
  return new PlayerEntity(
    player.id,
    player.createdTurn,
    player.civDefId,
    player.isAI,
    player.isBarbarian,
    player.gold,
    player.goldPerTurn,
    player.researchedTechs,
    player.adoptedPolicies,
    player.culturePerTurn,
    player.cultureStock,
    player.capitalCityId,
    player.isAlive,
    player.eliminatedTurn,
    player.currentResearch,
    player.needsNextTech,
  );
}

/** Applies one research tick to the selected player during turn resolution. */
export function runResearch(
  state: GameState,
  playerId: PlayerId,
  rules: ResearchRules = DEFAULT_RESEARCH,
): ResearchResult {
  const player = state.players[playerId];
  if (!player) return { state, events: [] };

  const nextPlayer = copyPlayer(player);
  if (nextPlayer.currentResearch === null) {
    nextPlayer.needsNextTech = true;
    return {
      state: { ...state, players: { ...state.players, [playerId]: nextPlayer } },
      events: [],
    };
  }

  const research = nextPlayer.currentResearch;
  const invested = research.scienceInvested + rules.sciencePerTurn(state, player);
  if (invested < rules.techCost(research.techDefId)) {
    nextPlayer.currentResearch = { ...research, scienceInvested: invested };
    nextPlayer.needsNextTech = false;
    return {
      state: { ...state, players: { ...state.players, [playerId]: nextPlayer } },
      events: [],
    };
  }

  nextPlayer.researchedTechs = [...nextPlayer.researchedTechs, research.techDefId];
  nextPlayer.currentResearch = null;
  nextPlayer.needsNextTech = true;
  return {
    state: { ...state, players: { ...state.players, [playerId]: nextPlayer } },
    events: [{ kind: "TechResearched", playerId, techDefId: research.techDefId }],
  };
}
