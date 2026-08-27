import { createPrng, type WrapContext } from "@freevilisation/engine";
import type { MapGenParams, MapGenResult } from "../pipeline.js";
import { MAP_TYPE_PRESETS } from "../config.js";
import {
  floodComponents as sharedFloodComponents,
  type FloodGrid,
  type FloodResult,
} from "../flood.js";
import { MIN_ISLAND_SIZE } from "./tiny-islands.js";

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

/** Reports a start position that is not on land. */
function findStrandedStart(result: MapGenResult): ValidationFailure | undefined {
  for (const start of result.startPositions) {
    const idx = start.r * result.width + start.q;
    if (!result.isLand[idx]) {
      return {
        ok: false,
        reason: `start position (${start.q},${start.r}) is not on land`,
      };
    }
  }
  return undefined;
}

/** Rejects a land/water ratio outside `LAND_FRACTION_TOLERANCE` of the map type's target. */
function checkLandFraction(
  result: MapGenResult,
  isLand: readonly boolean[],
): ValidationFailure | undefined {
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
function checkPangaeaShape(
  result: MapGenResult,
  isLand: readonly boolean[],
  flood: FloodResult,
): ValidationFailure | undefined {
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
 * Tiny islands have already been removed before terrain classification.
 * This pass rejects a stranded start, a land/water ratio outside the map
 * type's bounds, or a `pangaea` map that rolled multiple large landmasses.
 */
export function validateMap(result: MapGenResult): ValidationOutcome {
  const wrap: WrapContext = { isWraparoundX: result.isWraparoundX, width: result.width };
  const grid: FloodGrid = { width: result.width, height: result.height, wrap };
  const flood = sharedFloodComponents(grid, (idx) => result.isLand[idx]!);

  const failure =
    findStrandedStart(result) ??
    checkLandFraction(result, result.isLand) ??
    checkPangaeaShape(result, result.isLand, flood);
  if (failure) return failure;
  return { ok: true, result };
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
