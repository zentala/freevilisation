import type { GameState } from "../game-state.js";
import type { HexKey } from "../ids.js";
import { distance } from "../hex/hex-math.js";
import { fromHexKey, toHexKey } from "../hex/coords.js";
import { neighborsOf } from "../hex/graph.js";
import { toWrapContext } from "../hex/game-map.js";
import { stepCost } from "./step.js";
import type { UnitId } from "../ids.js";

interface SearchNode { readonly key: HexKey; readonly cost: number; readonly estimate: number }

function compareNodes(a: SearchNode, b: SearchNode): number {
  return a.estimate - b.estimate || a.cost - b.cost || (a.key as string).localeCompare(b.key as string);
}

function popLowest(open: SearchNode[]): SearchNode {
  let best = 0;
  for (let i = 1; i < open.length; i++) if (compareNodes(open[i]!, open[best]!) < 0) best = i;
  return open.splice(best, 1)[0]!;
}

function reconstruct(cameFrom: Map<HexKey, HexKey>, destination: HexKey): HexKey[] {
  const path: HexKey[] = [];
  let current: HexKey | undefined = destination;
  while (current !== undefined && cameFrom.has(current)) {
    path.push(current);
    current = cameFrom.get(current);
  }
  return path.reverse();
}

/** Finds the least-cost route as destination hexes, excluding the start. */
export function findPath(state: GameState, from: HexKey, to: HexKey): HexKey[] | null {
  if (!state.map.tiles[from] || !state.map.tiles[to]) return null;
  if (from === to) return [];
  const pathUnit = "pathfinding" as UnitId;
  const target = fromHexKey(to);
  const wrap = toWrapContext(state.map);
  const open: SearchNode[] = [{ key: from, cost: 0, estimate: distance(fromHexKey(from), target, wrap) }];
  const costs = new Map<HexKey, number>([[from, 0]]);
  const cameFrom = new Map<HexKey, HexKey>();
  while (open.length > 0) {
    const current = popLowest(open);
    if (current.key === to) return reconstruct(cameFrom, to);
    if (current.cost !== costs.get(current.key)) continue;
    const coord = fromHexKey(current.key);
    const next = neighborsOf(coord, state.map, (tile) => tile !== undefined);
    for (const neighbor of next) {
      const key = toHexKey(neighbor);
      const nextCost = current.cost + stepCost(state, pathUnit, current.key, key);
      if (nextCost >= (costs.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      costs.set(key, nextCost);
      cameFrom.set(key, current.key);
      open.push({ key, cost: nextCost, estimate: nextCost + distance(neighbor, target, wrap) });
    }
  }
  return null;
}
