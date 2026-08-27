import type {
  PlayerId,
  UnitId,
  CityId,
  HexKey,
  ImprovementDefId,
  DefId,
} from "../ids.js";
import type { GameState } from "../game-state.js";

export type Command =
  | { kind: "MoveUnit"; playerId: PlayerId; unitId: UnitId; path: HexKey[] }
  | {
      kind: "BuildImprovement";
      playerId: PlayerId;
      unitId: UnitId;
      improvementDefId: ImprovementDefId;
    }
  | { kind: "FortifyUnit"; playerId: PlayerId; unitId: UnitId }
  | { kind: "SleepUnit"; playerId: PlayerId; unitId: UnitId }
  | { kind: "FoundCity"; playerId: PlayerId; unitId: UnitId; name: string }
  | { kind: "EndTurn"; playerId: PlayerId };

export type GameEvent =
  | { kind: "UnitMoved"; unitId: UnitId; from: HexKey; to: HexKey; movesRemaining: number }
  | { kind: "CityFounded"; cityId: CityId; playerId: PlayerId; coord: HexKey } // TODO(E03): AxialCoord
  | { kind: "TurnStarted"; turn: number; activePlayerId: PlayerId | null }
  | { kind: "TurnEnded"; turn: number; activePlayerId: PlayerId | null }
  | { kind: "CityGrew"; cityId: CityId; newPopulation: number }
  | {
      kind: "ProductionCompleted";
      cityId: CityId;
      item: "unit" | "building" | "wonder";
      defId: DefId;
    }
  | { kind: "TechResearched"; playerId: PlayerId; techDefId: DefId<"tech"> };

export interface CommandRejection {
  readonly code: "malformed" | "not_your_turn" | "unknown_entity" | "not_owner" | "illegal";
  readonly message: string;
}

export type CommandResult =
  { ok: true; state: GameState; events: GameEvent[] } | { ok: false; reason: CommandRejection };
