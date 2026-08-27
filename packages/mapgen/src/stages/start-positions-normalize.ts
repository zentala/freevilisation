import { neighbors, type Prng, type WrapContext } from "@freevilisation/engine";
import type { LandmassResult } from "./landmass.js";
import type { ClimateResult } from "./climate.js";
import type { ResourcesResult } from "./resources.js";
import type { StartPosition } from "./start-positions.js";
import { TERRAIN } from "./climate.js";
import { RESOURCE_FIXTURE } from "./resources.js";
import { TERRAIN_QUALITY } from "./start-positions.js";

/** Minimum count of 1-ring neighbours that must clear `MIN_GOOD_QUALITY`. */
const MIN_GOOD_NEIGHBOURS = 2;

/** Terrain quality a neighbour must clear to count as "good" (see task spec). */
const MIN_GOOD_QUALITY = 2;

/** Terrain a normalized-up neighbour becomes — the cheapest quality-2 terrain. */
const UPGRADE_TERRAIN = TERRAIN.plains;

interface NeighbourInfo {
  readonly idx: number;
  readonly isLand: boolean;
  quality: number;
}

function neighbourInfos(
  pos: StartPosition,
  landmass: LandmassResult,
  climate: ClimateResult,
  wrap: WrapContext,
): NeighbourInfo[] {
  const { width, height } = landmass;
  const infos: NeighbourInfo[] = [];
  for (const { q, r } of neighbors(pos, wrap)) {
    if (r < 0 || r >= height) continue;
    if (!wrap.isWraparoundX && (q < 0 || q >= width)) continue;
    const idx = r * width + q;
    infos.push({
      idx,
      isLand: landmass.isLand[idx]!,
      quality: TERRAIN_QUALITY[climate.terrainDefId[idx]!] ?? 0,
    });
  }
  return infos;
}

/** Among untouched land neighbours below the floor, the worst one, ties broken by `prng`. */
function pickWorstNeighbour(infos: readonly NeighbourInfo[], prng: Prng): NeighbourInfo | undefined {
  const eligible = infos.filter((n) => n.isLand && n.quality < MIN_GOOD_QUALITY);
  if (eligible.length === 0) return undefined;
  const worst = Math.min(...eligible.map((n) => n.quality));
  const tied = eligible.filter((n) => n.quality === worst);
  return tied[Math.floor(prng.next() * tied.length)];
}

/** Raises the worst-scoring land neighbours to `UPGRADE_TERRAIN` until the floor is met. */
function normalizeTerrainFloor(
  infos: NeighbourInfo[],
  climate: ClimateResult,
  prng: Prng,
): void {
  let goodCount = infos.filter((n) => n.quality >= MIN_GOOD_QUALITY).length;
  while (goodCount < MIN_GOOD_NEIGHBOURS) {
    const target = pickWorstNeighbour(infos, prng);
    if (!target) break; // no land neighbour left to upgrade
    climate.terrainDefId[target.idx] = UPGRADE_TERRAIN;
    target.quality = TERRAIN_QUALITY[UPGRADE_TERRAIN]!;
    goodCount += 1;
  }
}

/** Attaches a resource to one land neighbour if none of them already carries one. */
function normalizeResourceFloor(
  infos: readonly NeighbourInfo[],
  climate: ClimateResult,
  resources: ResourcesResult,
  prng: Prng,
): void {
  if (infos.some((n) => resources.resourceDefId[n.idx] !== null)) return;

  const landNeighbours = infos.filter((n) => n.isLand);
  if (landNeighbours.length === 0) return; // no land neighbour to place a resource on

  const eligible = landNeighbours.filter((n) =>
    RESOURCE_FIXTURE.some((f) => f.validOnTerrains.includes(climate.terrainDefId[n.idx]!)),
  );

  const target =
    eligible.length > 0
      ? eligible[Math.floor(prng.next() * eligible.length)]!
      : landNeighbours[Math.floor(prng.next() * landNeighbours.length)]!;

  if (eligible.length === 0) {
    // No neighbour terrain accepts any resource — upgrade guarantees `resource_wheat` fits.
    climate.terrainDefId[target.idx] = UPGRADE_TERRAIN;
  }

  const terrainId = climate.terrainDefId[target.idx]!;
  const fixture = RESOURCE_FIXTURE.find((f) => f.validOnTerrains.includes(terrainId))!;
  resources.resourceDefId[target.idx] = fixture.id;
}

/**
 * Normalization pass (task E04-W4b-T01): Civ V fixes bad starts rather than
 * rejecting them. `farthestPointSample` can still hand back a start whose
 * 1-ring has no food and no resource — most likely on a tiny map where the
 * quality floor already relaxed to 0. For every chosen start, this raises its
 * neighbours until at least `MIN_GOOD_NEIGHBOURS` clear `MIN_GOOD_QUALITY`
 * and at least one carries a resource, mutating `climate.terrainDefId` and
 * `resources.resourceDefId` in place so the pipeline's final result picks up
 * the change automatically.
 *
 * Not a rewrite of the region system: this only patches the immediate ring
 * around the tile already picked, it does not re-run placement.
 */
export function normalizeStartPositions(
  positions: readonly StartPosition[],
  landmass: LandmassResult,
  climate: ClimateResult,
  resources: ResourcesResult,
  wrap: WrapContext,
  prng: Prng,
): void {
  for (const pos of positions) {
    const infos = neighbourInfos(pos, landmass, climate, wrap);
    normalizeTerrainFloor(infos, climate, prng);
    normalizeResourceFloor(infos, climate, resources, prng);
  }
}
