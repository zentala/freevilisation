import { createHash } from "node:crypto";
import type { GameState } from "./game-state.js";
import type { Registry } from "./registry.js";
import type { EntityId, UnitId, CityId, PlayerId, HexKey } from "./ids.js";
import { Unit } from "./entities/Unit.js";
import { City } from "./entities/City.js";
import { Player } from "./entities/Player.js";
import { Tile } from "./entities/Tile.js";

interface PlainEntity {
  id: string;
  type: string;
  ownerId: string | null;
  createdTurn: number;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function asNum(v: unknown): number {
  return v as number;
}

function asBool(v: unknown): boolean {
  return v as boolean;
}

function reviveUnit(p: PlainEntity): Unit {
  return new Unit(
    p.id as EntityId,
    asNum(p.createdTurn),
    p.defId as never,
    p.ownerId as PlayerId,
    p.coord as HexKey,
    asNum(p.hp),
    asNum(p.movesLeft),
    asNum(p.movesMax),
    p.promotions as never[],
    asNum(p.experience),
    asNum(p.fortifiedTurns),
    asBool(p.isEmbarked),
  );
}

function reviveCity(p: PlainEntity): City {
  return new City(
    p.id as EntityId,
    asNum(p.createdTurn),
    p.ownerId as PlayerId,
    asNum(p.foundedTurn),
    p.centerTile as HexKey,
    p.name as string,
    asNum(p.population),
    asNum(p.foodStock),
    asNum(p.productionStock),
    p.workedTiles as HexKey[],
    p.claimedTiles as HexKey[],
    p.buildings as never[],
    p.wonders as never[],
    asNum(p.health),
    asNum(p.defenseStrength),
    asBool(p.isCapital),
  );
}

function revivePlayer(p: PlainEntity): Player {
  return new Player(
    p.id as EntityId,
    asNum(p.createdTurn),
    p.civDefId as never,
    asBool(p.isAI),
    asBool(p.isBarbarian),
    asNum(p.gold),
    asNum(p.goldPerTurn),
    p.researchedTechs as never[],
    p.adoptedPolicies as never[],
    asNum(p.culturePerTurn),
    asNum(p.cultureStock),
    p.capitalCityId as CityId | null,
    asBool(p.isAlive),
    p.eliminatedTurn as number | null,
  );
}

function reviveTile(p: PlainEntity): Tile {
  return new Tile(
    p.id as EntityId,
    asNum(p.createdTurn),
    p.hexKey as HexKey,
    p.terrainDefId as never,
    p.featureDefId as never,
    p.resourceDefId as never,
    p.improvementDefId as never,
    asBool(p.hasRiver),
    p.ownerCity as CityId | null,
    p.ownerPlayer as PlayerId | null,
    p.workedByCity as CityId | null,
    p.occupantUnitIds as UnitId[],
  );
}

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value) obj[k] = v;
    return canonicalize(obj);
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map((k) => {
      const v = (value as Record<string, unknown>)[k];
      return JSON.stringify(k) + ":" + canonicalize(v);
    });
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(String(value));
}

function projectEntity(entity: { [key: string]: unknown }): PlainEntity {
  const plain: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entity)) {
    if (v instanceof Map) {
      plain[k] = Object.fromEntries(v);
    } else {
      plain[k] = v;
    }
  }
  return plain as PlainEntity;
}

function projectState(state: GameState): Record<string, unknown> {
  const plain: Record<string, unknown> = {
    gameId: state.gameId,
    turn: state.turn,
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    playerOrder: state.playerOrder,
    map: {
      width: state.map.width,
      height: state.map.height,
      isWraparoundX: state.map.isWraparoundX,
      tiles: Object.fromEntries(
        Object.entries(state.map.tiles).map(([k, v]) => [
          k,
          projectEntity(v as unknown as { [key: string]: unknown }),
        ]),
      ),
    },
    entities: {
      units: Object.fromEntries(
        Object.entries(state.entities.units).map(([k, v]) => [
          k,
          projectEntity(v as unknown as { [key: string]: unknown }),
        ]),
      ),
      cities: Object.fromEntries(
        Object.entries(state.entities.cities).map(([k, v]) => [
          k,
          projectEntity(v as unknown as { [key: string]: unknown }),
        ]),
      ),
    },
    rngState: { ...state.rngState },
    rulesetRef: { ...state.rulesetRef },
    settings: { ...state.settings },
    nextEntitySeq: state.nextEntitySeq,
    winnerPlayerId: state.winnerPlayerId,
    victoryType: state.victoryType,
  };

  const players: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state.players)) {
    players[k] = projectEntity(v as unknown as { [key: string]: unknown });
  }
  plain.players = players;

  return plain;
}

/**
 * Serializes state canonically: keys are sorted, so the same state always
 * produces byte-identical JSON regardless of the order fields were assigned.
 * Plain `JSON.stringify` would emit insertion order, and a revived entity
 * assigns its fields in constructor order — so a round-trip would change the
 * bytes without changing the state.
 */
export function serialize(state: GameState): string {
  return canonicalize(projectState(state));
}

export function deserialize(json: string, _registry: Registry): GameState {
  const raw = JSON.parse(json) as Record<string, Any>;
  const entitiesRaw = raw.entities as Record<string, Record<string, Any>>;
  const mapRaw = raw.map as Record<string, Any>;
  const tilesRaw = mapRaw.tiles as Record<string, Any>;

  const units = Object.fromEntries(
    Object.entries(entitiesRaw.units ?? {}).map(([k, v]) => [k, reviveUnit(v)]),
  );

  const cities = Object.fromEntries(
    Object.entries(entitiesRaw.cities ?? {}).map(([k, v]) => [k, reviveCity(v)]),
  );

  const players = Object.fromEntries(
    Object.entries(raw.players as Record<string, Any>).map(([k, v]) => [k, revivePlayer(v)]),
  );

  const tiles = Object.fromEntries(Object.entries(tilesRaw).map(([k, v]) => [k, reviveTile(v)]));

  return {
    gameId: raw.gameId as EntityId,
    turn: raw.turn as number,
    phase: raw.phase as GameState["phase"],
    activePlayerId: raw.activePlayerId as PlayerId | null,
    players,
    playerOrder: raw.playerOrder as PlayerId[],
    map: {
      width: mapRaw.width as number,
      height: mapRaw.height as number,
      isWraparoundX: mapRaw.isWraparoundX as boolean,
      tiles,
    },
    entities: { units, cities },
    rngState: raw.rngState as GameState["rngState"],
    rulesetRef: raw.rulesetRef as GameState["rulesetRef"],
    settings: raw.settings as GameState["settings"],
    nextEntitySeq: raw.nextEntitySeq as number,
    winnerPlayerId: raw.winnerPlayerId as PlayerId | null,
    victoryType: raw.victoryType as GameState["victoryType"],
  };
}

export function stateHash(state: GameState): string {
  const canonical = canonicalize(projectState(state));
  return createHash("sha256").update(canonical).digest("hex");
}
