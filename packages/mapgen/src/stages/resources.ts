import type { ResourceDefId, TerrainDefId } from "@freevilisation/engine";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { ClimateResult } from "./climate.js";
import type { LandmassResult } from "./landmass.js";

type ResourceClass = "bonus" | "strategic" | "luxury";

export interface ResourceFixture {
  readonly id: ResourceDefId;
  readonly resourceClass: ResourceClass;
  readonly validOnTerrains: readonly TerrainDefId[];
  readonly minSpacing: number;
}

/**
 * Resource fixture — declaration order = tie-break priority when a tile is
 * eligible for more than one resource. Spacing increases with rarity:
 * bonus 2, strategic 4, luxury 5. Density decreases with rarity:
 * bonus 0.12, strategic 0.06, luxury 0.03.
 */
export const RESOURCE_FIXTURE: readonly ResourceFixture[] = [
  {
    id: "resource_wheat" as ResourceDefId,
    resourceClass: "bonus",
    validOnTerrains: ["terrain_grassland" as TerrainDefId, "terrain_plains" as TerrainDefId],
    minSpacing: 2,
  },
  {
    id: "resource_horses" as ResourceDefId,
    resourceClass: "bonus",
    validOnTerrains: [
      "terrain_grassland" as TerrainDefId,
      "terrain_plains" as TerrainDefId,
      "terrain_tundra" as TerrainDefId,
    ],
    minSpacing: 2,
  },
  {
    id: "resource_iron" as ResourceDefId,
    resourceClass: "strategic",
    validOnTerrains: [
      "terrain_plains" as TerrainDefId,
      "terrain_desert" as TerrainDefId,
      "terrain_tundra" as TerrainDefId,
    ],
    minSpacing: 4,
  },
  {
    id: "resource_copper" as ResourceDefId,
    resourceClass: "strategic",
    validOnTerrains: ["terrain_plains" as TerrainDefId, "terrain_grassland" as TerrainDefId],
    minSpacing: 4,
  },
  {
    id: "resource_gems" as ResourceDefId,
    resourceClass: "luxury",
    validOnTerrains: ["terrain_grassland" as TerrainDefId, "terrain_plains" as TerrainDefId],
    minSpacing: 5,
  },
  {
    id: "resource_silk" as ResourceDefId,
    resourceClass: "luxury",
    validOnTerrains: ["terrain_grassland" as TerrainDefId],
    minSpacing: 5,
  },
  {
    id: "resource_spices" as ResourceDefId,
    resourceClass: "luxury",
    validOnTerrains: ["terrain_desert" as TerrainDefId, "terrain_grassland" as TerrainDefId],
    minSpacing: 5,
  },
] as const;

/** Density per resource class — rarer classes get lower density. */
const CLASS_DENSITY: Record<ResourceClass, number> = {
  bonus: 0.12,
  strategic: 0.06,
  luxury: 0.03,
};

export interface ResourcesResult {
  readonly resourceDefId: (ResourceDefId | null)[];
}

export function generateResources(
  _params: MapGenParams,
  climate: ClimateResult,
  landmass: LandmassResult,
  ctx: StageContext,
): ResourcesResult {
  const { width, height } = landmass;
  const tileCount = width * height;
  const resourceDefId = new Array<ResourceDefId | null>(tileCount).fill(null);
  const placedPositions = new Map<ResourceDefId, Array<[number, number]>>();

  ctx.onProgress(0);

  for (let fi = 0; fi < RESOURCE_FIXTURE.length; fi++) {
    const fixture = RESOURCE_FIXTURE[fi]!;
    const density = CLASS_DENSITY[fixture.resourceClass];
    const resourcePrng = ctx.prng.fork("resource-" + fixture.id);

    const candidates: Array<[number, number]> = [];

    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const idx = r * width + q;
        if (!landmass.isLand[idx]) continue;
        if (resourceDefId[idx] !== null) continue;
        if (!fixture.validOnTerrains.includes(climate.terrainDefId[idx]!)) continue;

        if (resourcePrng.next() < density) {
          candidates.push([r, q]);
        }
      }
    }

    const placed = placedPositions.get(fixture.id) ?? [];

    for (const [r, q] of candidates) {
      if (resourceDefId[r * width + q] !== null) continue;

      let tooClose = false;
      for (const [pr, pq] of placed) {
        const dr = Math.abs(r - pr);
        const dq = Math.abs(q - pq);
        if (Math.max(dr, dq) < fixture.minSpacing) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        resourceDefId[r * width + q] = fixture.id;
        placed.push([r, q]);
      }
    }

    if (placed.length > 0) {
      placedPositions.set(fixture.id, placed);
    }

    ctx.onProgress(Math.round(((fi + 1) / RESOURCE_FIXTURE.length) * 100));
  }

  return { resourceDefId };
}
