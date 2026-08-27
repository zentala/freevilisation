import { createPrng, type WrapContext } from "@freevilisation/engine";
import type { MapGenParams, MapGenResult } from "../pipeline.js";
import { MAP_TYPE_PRESETS } from "../config.js";
import { TERRAIN } from "./climate.js";
import { floodComponents as sharedFloodComponents, type FloodGrid, type FloodResult } from "../flood.js";

/**
 * Connected-component tile count below which a landmass is deleted rather
 * than kept, mirroring Freeciv's `remove_tiny_islands()`.
 */
export const MIN_ISLAND_SIZE = 3;

/** How far the actual land fraction may drift from the map type's target before the map is rejected. */
export const LAND_FRACTION_TOLERANCE = 0.1;

/** Share of surviving land a `pangaea` map's largest landmass must hold to count as one continent. */
const PANGAEA_DOMINANT_FRACTION = 0.85;

/** Bounded retries for failures a local repair cannot fix (stranded start, wrong shape). */
export const MAX_REROLL_ATTEMPTS = 5;

export interface ValidationSuccess {
  readonly ok: true;
  /** The input result, or a repaired copy if tiny islands were removed. */
  readonly result: MapGenResult;
}

export interface ValidationFailure {
  readonly ok: false;
  /** Human-readable reason a bounded reroll is needed. */
  readonly reason: string;
}

export type ValidationOutcome = ValidationSuccess | ValidationFailure;

interface RepairedMap {
  readonly isLand: boolean[];
  readonly terrainDefId: MapGenResult["terrainDefId"];
  readonly featureDefId: MapGenResult["featureDefId"];
  readonly resourceDefId: MapGenResult["resourceDefId"];
  readonly riverEdgeDir0: boolean[];
  readonly riverEdgeDir1: boolean[];
  readonly riverEdgeDir2: boolean[];
  readonly repaired: boolean;
}

/** Converts every tile in an undersized landmass to ocean, clearing its climate/feature/river/resource state. */
function repairTinyIslands(result: MapGenResult, flood: FloodResult): RepairedMap {
  const isLand = result.isLand.slice();
  const terrainDefId = result.terrainDefId.slice();
  const featureDefId = result.featureDefId.slice();
  const resourceDefId = result.resourceDefId.slice();
  const riverEdgeDir0 = result.riverEdgeDir0.slice();
  const riverEdgeDir1 = result.riverEdgeDir1.slice();
  const riverEdgeDir2 = result.riverEdgeDir2.slice();

  let repaired = false;
  for (let i = 0; i < isLand.length; i++) {
    const id = flood.componentId[i]!;
    if (id === -1 || flood.componentSize[id]! >= MIN_ISLAND_SIZE) continue;
    isLand[i] = false;
    terrainDefId[i] = TERRAIN.ocean;
    featureDefId[i] = null;
    resourceDefId[i] = null;
    riverEdgeDir0[i] = false;
    riverEdgeDir1[i] = false;
    riverEdgeDir2[i] = false;
    repaired = true;
  }

  return { isLand, terrainDefId, featureDefId, resourceDefId, riverEdgeDir0, riverEdgeDir1, riverEdgeDir2, repaired };
}

/** Reports a start position whose landmass the repair pass just removed, if any. */
function findStrandedStart(result: MapGenResult, isLand: readonly boolean[]): ValidationFailure | undefined {
  for (const start of result.startPositions) {
    const idx = start.r * result.width + start.q;
    if (!isLand[idx]) {
      return {
        ok: false,
        reason: `start position (${start.q},${start.r}) stranded: its landmass was removed as an undersized island`,
      };
    }
  }
  return undefined;
}

/** Rejects a land/water ratio outside `LAND_FRACTION_TOLERANCE` of the map type's target. */
function checkLandFraction(result: MapGenResult, isLand: readonly boolean[]): ValidationFailure | undefined {
  const landTiles = isLand.filter(Boolean).length;
  const landFraction = landTiles / isLand.length;
  const targetLandFraction = MAP_TYPE_PRESETS[result.mapType].targetLandFraction;
  if (Math.abs(landFraction - targetLandFraction) <= LAND_FRACTION_TOLERANCE) return undefined;
  return {
    ok: false,
    reason: `land fraction ${landFraction.toFixed(3)} is outside tolerance ${LAND_FRACTION_TOLERANCE} around ${result.mapType}'s target ${targetLandFraction}`,
  };
}

/** Rejects a `pangaea` map whose land is split across more than one large landmass. */
function checkPangaeaShape(result: MapGenResult, isLand: readonly boolean[], flood: FloodResult): ValidationFailure | undefined {
  if (result.mapType !== "pangaea") return undefined;
  const landTiles = isLand.filter(Boolean).length;
  if (landTiles === 0) return undefined;
  const survivingSizes = flood.componentSize.filter((size) => size >= MIN_ISLAND_SIZE);
  const largest = Math.max(0, ...survivingSizes);
  if (largest / landTiles >= PANGAEA_DOMINANT_FRACTION) return undefined;
  return {
    ok: false,
    reason:
      `pangaea map rolled ${survivingSizes.length} separate landmasses instead of one ` +
      `(largest holds ${((largest / landTiles) * 100).toFixed(1)}% of land)`,
  };
}

/**
 * Post-pipeline sanity pass over a generated map.
 *
 * Repairs the common case locally: undersized landmasses (below
 * `MIN_ISLAND_SIZE` tiles) are converted to ocean rather than triggering a
 * reroll. Only failures a local repair cannot fix are reported as
 * rejections: a start position stranded by that repair, a land/water ratio
 * outside the map type's bounds, or a `pangaea` map that rolled more than
 * one large landmass.
 */
export function validateMap(result: MapGenResult): ValidationOutcome {
  const wrap: WrapContext = { isWraparoundX: result.isWraparoundX, width: result.width };
  const grid: FloodGrid = { width: result.width, height: result.height, wrap };
  const isLand = result.isLand;
  const flood = sharedFloodComponents(grid, (idx) => isLand[idx]!);
  const repair = repairTinyIslands(result, flood);

  const failure =
    findStrandedStart(result, repair.isLand) ??
    checkLandFraction(result, repair.isLand) ??
    checkPangaeaShape(result, repair.isLand, flood);
  if (failure) return failure;

  if (!repair.repaired) {
    return { ok: true, result };
  }
  const { repaired: _repaired, ...patch } = repair;
  return {
    ok: true,
    result: { ...result, ...patch },
  };
}

/**
 * Runs `generate` and validates its output, bounded-retrying with a forked
 * seed on failures `validateMap` cannot repair locally. Throws once
 * `MAX_REROLL_ATTEMPTS` retries are exhausted, rather than looping forever.
 */
export function generateWithValidation(
  params: MapGenParams,
  generate: (params: MapGenParams) => MapGenResult,
): MapGenResult {
  let attemptParams = params;
  for (let attempt = 0; attempt <= MAX_REROLL_ATTEMPTS; attempt++) {
    const outcome = validateMap(generate(attemptParams));
    if (outcome.ok) return outcome.result;
    if (attempt === MAX_REROLL_ATTEMPTS) {
      throw new Error(
        `Map generation failed validation after ${MAX_REROLL_ATTEMPTS} reroll attempts ` +
          `(seed ${params.seed}, ${params.mapType}/${params.mapSize}): ${outcome.reason}`,
      );
    }
    const rerollSeed = createPrng(attemptParams.seed).fork(`reroll-${attempt}`).state().state;
    attemptParams = { ...attemptParams, seed: rerollSeed };
  }
  throw new Error("unreachable");
}
