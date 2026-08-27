import { describe, it, expect } from "vitest";
import { neighbors } from "@freevilisation/engine";
import { generateMap } from "./pipeline.js";
import { MAP_SIZES, MAP_TYPE_PRESETS } from "./config.js";
import type { MapType, MapSize } from "./pipeline.js";
import { TERRAIN } from "./stages/climate.js";
import { TERRAIN_LAKE } from "./stages/water.js";
import { floodComponents } from "./flood.js";

const MAP_TYPES: readonly MapType[] = ["continents", "pangaea", "archipelago", "islands"];
const MAP_SIZE_NAMES = Object.keys(MAP_SIZES) as MapSize[];

describe("generateMap", () => {
  it("reclassifies water after tiny-island removal", () => {
    const result = generateMap({ seed: 2, mapType: "continents", mapSize: "small" });
    const wrap = { isWraparoundX: result.isWraparoundX, width: result.width };

    for (let idx = 0; idx < result.isLand.length; idx++) {
      if (result.isLand[idx]) {
        expect(result.distanceToLand[idx]).toBe(0);
        continue;
      }
      expect(result.distanceToLand[idx]).toBeGreaterThan(0);
      if (result.terrainDefId[idx] !== TERRAIN.coast) continue;
      const coord = { q: idx % result.width, r: Math.floor(idx / result.width) };
      const adjacentToLand = neighbors(coord, wrap).some((next) => {
        if (next.r < 0 || next.r >= result.height) return false;
        return result.isLand[next.r * result.width + next.q]!;
      });
      expect(adjacentToLand).toBe(true);
    }
  });

  for (const mapType of MAP_TYPES) {
    for (const mapSize of MAP_SIZE_NAMES) {
      it(`${mapType} ${mapSize}: has world ocean and only bounded lakes`, () => {
        const result = generateMap({ seed: 42, mapType, mapSize });
        const grid = {
          width: result.width,
          height: result.height,
          wrap: { isWraparoundX: result.isWraparoundX, width: result.width },
        };
        const ocean = floodComponents(
          grid,
          (idx) => !result.isLand[idx]! && result.terrainDefId[idx] !== TERRAIN_LAKE,
        );
        const oceanTouchesWorldEdge = ocean.componentTiles.some((tiles) =>
          tiles.some((idx) => {
            const row = Math.floor(idx / result.width);
            return row === 0 || row === result.height - 1;
          }),
        );
        const lakeComponents = floodComponents(
          grid,
          (idx) => result.terrainDefId[idx] === TERRAIN_LAKE,
        );

        expect(oceanTouchesWorldEdge).toBe(true);
        for (const size of lakeComponents.componentSize) {
          expect(size).toBeLessThan(MAP_TYPE_PRESETS[mapType].maxLakeSize);
        }
      });
    }
  }

  for (const mapType of MAP_TYPES) {
    it(`${mapType} tiny: width/height match MAP_SIZES and arrays have correct length`, () => {
      const result = generateMap({ seed: 42, mapType, mapSize: "tiny" });
      const { width, height } = MAP_SIZES.tiny!;
      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      expect(result.elevation.length).toBe(width * height);
      expect(result.isLand.length).toBe(width * height);
    });
  }

  it("throws on unknown mapType", () => {
    expect(() => generateMap({ seed: 1, mapType: "blob" as MapType, mapSize: "tiny" })).toThrow(
      'Unknown mapType: "blob"',
    );
  });

  it("throws on prototype-keyed mapType (Object.prototype.constructor)", () => {
    expect(() =>
      generateMap({ seed: 1, mapType: "constructor" as MapType, mapSize: "tiny" }),
    ).toThrow('Unknown mapType: "constructor"');
  });

  it("throws on unknown mapSize", () => {
    expect(() =>
      generateMap({ seed: 1, mapType: "continents", mapSize: "mega" as MapSize }),
    ).toThrow('Unknown mapSize: "mega"');
  });

  it("throws on prototype-keyed mapSize (Object.prototype.constructor)", () => {
    expect(() =>
      generateMap({ seed: 1, mapType: "continents", mapSize: "constructor" as MapSize }),
    ).toThrow('Unknown mapSize: "constructor"');
  });

  it("determinism: same params produce deeply-equal elevation and isLand", () => {
    const params = { seed: 9999, mapType: "pangaea" as const, mapSize: "small" as const };
    const r1 = generateMap(params);
    const r2 = generateMap(params);
    expect(r1.elevation).toEqual(r2.elevation);
    expect(r1.isLand).toEqual(r2.isLand);
  });

  it("different seeds produce different elevation arrays", () => {
    const r1 = generateMap({ seed: 1, mapType: "continents", mapSize: "tiny" });
    const r2 = generateMap({ seed: 2, mapType: "continents", mapSize: "tiny" });
    expect(r1.elevation).not.toEqual(r2.elevation);
  });

  it("onProgress: spy is called at least twice, non-decreasing, last call is 100", () => {
    const calls: number[] = [];
    generateMap({ seed: 1, mapType: "continents", mapSize: "tiny" }, (pct) => calls.push(pct));
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i]!).toBeGreaterThanOrEqual(calls[i - 1]!);
    }
    expect(calls[calls.length - 1]).toBe(100);
  });

  // Every map type wraps east-west in v1 (see config.ts). This test fails
  // loudly if a single preset is ever flipped back to non-wrapping, so the
  // inconsistency config.ts warns against can't slip back in silently.
  it("reports isWraparoundX === true for every map type", () => {
    for (const mapType of MAP_TYPES) {
      expect(generateMap({ seed: 1, mapType, mapSize: "tiny" }).isWraparoundX).toBe(true);
    }
  });

  it("onProgress omitted does not throw", () => {
    expect(() => generateMap({ seed: 1, mapType: "continents", mapSize: "tiny" })).not.toThrow();
  });

  it("wires startPositions through to the result: on land, unique, numPlayers of them", () => {
    const result = generateMap({ seed: 42, mapType: "continents", mapSize: "tiny", numPlayers: 6 });
    expect(result.startPositions.length).toBe(6);
    const seen = new Set<string>();
    for (const { q, r } of result.startPositions) {
      expect(result.isLand[r * result.width + q]).toBe(true);
      const key = `${q},${r}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("defaults to 4 start positions when numPlayers is omitted", () => {
    const result = generateMap({ seed: 42, mapType: "continents", mapSize: "tiny" });
    expect(result.startPositions.length).toBe(4);
  });
});
