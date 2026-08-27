import { describe, it, expect } from "vitest";
import { distance } from "@freevilisation/engine";
import { generateMap } from "../pipeline.js";
import type { MapType } from "../pipeline.js";
import { MAP_TYPE_PRESETS } from "../config.js";
import { LAND_FRACTION_TOLERANCE } from "./validation.js";

/**
 * Statistical bounds test suite (E04-W4c-T01).
 *
 * Unlike the golden-seed snapshots, these assertions are ranges, not exact
 * values: they must keep passing when a generator change legitimately moves
 * the output, and only fail when a change pushes a stage outside its
 * documented behaviour (a `pangaea` that is mostly ocean, a map that is
 * 90% desert, start positions crammed into a corner).
 */

const MAP_TYPES: readonly MapType[] = ["continents", "pangaea", "archipelago", "islands"];

/** Seeds sampled per map type for the land/water and biome checks. */
const SEED_SAMPLE_SIZE = 20;

/** Map size used for every sample — large enough that ratios are not swamped by rounding. */
const SAMPLE_MAP_SIZE = "standard";

/**
 * No single biome may hold more than this share of land tiles. Land tiles
 * only — ocean/coast are excluded, since a map is water-dominated by design
 * on some map types and that is `checkLandFraction`'s job, not this one's.
 */
const MAX_BIOME_SHARE_OF_LAND = 0.8;

/** Player counts exercised by the start-position spread check. */
const PLAYER_COUNTS = [2, 4, 8] as const;

/** Seeds sampled per player count for the start-position spread check. */
const START_POSITION_BATCH_SIZE = 50;

/**
 * Minimum acceptable hex distance between any two start positions. Not read
 * from a shared constant because `start-positions.ts` has no such floor
 * today — the sampler only maximizes spread, it does not reject a result
 * for falling short of one. Chosen to match the floor already exercised in
 * `start-positions-geometry.test.ts`'s single-seed check.
 */
const MIN_START_DISTANCE_FLOOR = 2;

describe("mapgen — statistical bounds", () => {
  describe("land/water ratio per map type", () => {
    for (const mapType of MAP_TYPES) {
      const target = MAP_TYPE_PRESETS[mapType].targetLandFraction;

      it(`${mapType}: land fraction stays within ${LAND_FRACTION_TOLERANCE} of the ${target} target across ${SEED_SAMPLE_SIZE} seeds`, () => {
        for (let seed = 0; seed < SEED_SAMPLE_SIZE; seed++) {
          const result = generateMap({ seed, mapType, mapSize: SAMPLE_MAP_SIZE });
          const landFraction = result.isLand.filter(Boolean).length / result.isLand.length;
          expect(landFraction).toBeGreaterThanOrEqual(target - LAND_FRACTION_TOLERANCE);
          expect(landFraction).toBeLessThanOrEqual(target + LAND_FRACTION_TOLERANCE);
        }
      });
    }
  });

  describe("biome distribution is not degenerate", () => {
    for (const mapType of MAP_TYPES) {
      it(`${mapType}: no single biome exceeds ${MAX_BIOME_SHARE_OF_LAND * 100}% of land tiles across ${SEED_SAMPLE_SIZE} seeds`, () => {
        for (let seed = 0; seed < SEED_SAMPLE_SIZE; seed++) {
          const result = generateMap({ seed, mapType, mapSize: SAMPLE_MAP_SIZE });
          const counts = new Map<string, number>();
          let landTiles = 0;
          for (let i = 0; i < result.isLand.length; i++) {
            if (!result.isLand[i]) continue;
            landTiles++;
            const terrain = result.terrainDefId[i]!;
            counts.set(terrain, (counts.get(terrain) ?? 0) + 1);
          }
          expect(landTiles).toBeGreaterThan(0);
          const maxShare = Math.max(...counts.values()) / landTiles;
          expect(maxShare).toBeLessThan(MAX_BIOME_SHARE_OF_LAND);
        }
      });
    }
  });

  describe("start positions keep a minimum spread", () => {
    for (const numPlayers of PLAYER_COUNTS) {
      it(`${numPlayers} players: minimum pairwise start distance is at least ${MIN_START_DISTANCE_FLOOR} in every seed of a ${START_POSITION_BATCH_SIZE}-seed batch`, () => {
        for (let seed = 0; seed < START_POSITION_BATCH_SIZE; seed++) {
          const result = generateMap({
            seed,
            mapType: "continents",
            mapSize: SAMPLE_MAP_SIZE,
            numPlayers,
          });
          const wrap = { isWraparoundX: result.isWraparoundX, width: result.width };
          const positions = result.startPositions;
          let minDistance = Infinity;
          for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
              const d = distance(positions[i]!, positions[j]!, wrap);
              if (d < minDistance) minDistance = d;
            }
          }
          expect(minDistance).toBeGreaterThanOrEqual(MIN_START_DISTANCE_FLOOR);
        }
      });
    }
  });
});
