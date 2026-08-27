import type { GameState } from "../game-state.js";
import type { Tile } from "../entities/Tile.js";
import type { HexKey, UnitId } from "../ids.js";
import { fromHexKey, toHexKey } from "../hex/coords.js";
import { AXIAL_DIRECTIONS, neighbors, type WrapContext } from "../hex/hex-math.js";
import { hasRiverEdge } from "../hex/river-edges.js";
import { toWrapContext } from "../hex/game-map.js";

type MovementTile = Tile & {
  movementCost?: number;
  movementCostAdd?: number;
  isImpassable?: boolean;
};

const DEFAULT_COSTS: Record<string, number> = {
  grassland: 1, plains: 1, desert: 1, tundra: 1, snow: 1,
  coast: 1, ocean: 1, lake: 1, hills: 2,
};
const ROAD_COST_MULTIPLIER = 0.5;
const RIVER_CROSSING_COST = 1;

function terrainName(tile: Tile): string {
  return (tile.terrainDefId as string).replace(/^terrain_/, "").toLowerCase();
}

function terrainCost(tile: Tile): number {
  const candidate = tile as MovementTile;
  const name = terrainName(tile);
  if (candidate.isImpassable === true || name === "mountain" || name === "mountains") {
    return Number.POSITIVE_INFINITY;
  }
  return candidate.movementCost ?? DEFAULT_COSTS[name] ?? 1;
}

function featureCost(tile: Tile): number {
  const add = (tile as MovementTile).movementCostAdd ?? 0;
  return Number.isFinite(add) ? add : Number.POSITIVE_INFINITY;
}

function edgeDirection(from: HexKey, to: HexKey, wrap: WrapContext): number {
  const fromCoord = fromHexKey(from);
  return neighbors(fromCoord, wrap).findIndex((candidate) => toHexKey(candidate) === to);
}

function edgeModifier(state: GameState, from: HexKey, to: HexKey, base: number): number {
  const fromCoord = fromHexKey(from);
  const direction = edgeDirection(from, to, toWrapContext(state.map));
  if (direction < 0) return Number.POSITIVE_INFINITY;
  const destination = state.map.tiles[to]!;
  const hasRoad = (destination.improvementDefId as string | null)?.endsWith("_road") ?? false;
  const roadCost = hasRoad ? base * ROAD_COST_MULTIPLIER : base;
  return roadCost + (hasRiverEdge(state.map, fromCoord, direction) ? RIVER_CROSSING_COST : 0);
}

/** Returns the composed cost of entering an adjacent destination hex. */
export function stepCost(
  state: GameState,
  _unit: UnitId,
  from: HexKey,
  to: HexKey,
): number {
  const fromTile = state.map.tiles[from];
  const destination = state.map.tiles[to];
  if (!fromTile || !destination || edgeDirection(from, to, toWrapContext(state.map)) < 0) {
    return Number.POSITIVE_INFINITY;
  }
  const terrain = terrainCost(destination);
  const feature = featureCost(destination);
  if (!Number.isFinite(terrain) || !Number.isFinite(feature) || terrain + feature <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return edgeModifier(state, from, to, terrain + feature);
}

/** Returns whether a unit may enter the destination in one legal step. */
export function canEnter(
  state: GameState,
  unit: UnitId,
  from: HexKey,
  to: HexKey,
): boolean {
  return Number.isFinite(stepCost(state, unit, from, to));
}
