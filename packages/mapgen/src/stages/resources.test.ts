import { describe, it, expect } from "vitest";
import { createPrng, type ResourceDefId } from "@freevilisation/engine";
import { generateResources, RESOURCE_FIXTURE } from "./resources.js";
import { generateLandmass } from "./landmass.js";
import { generateClimate } from "./climate.js";
import type { MapGenParams } from "../pipeline.js";

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

function runResources(params: MapGenParams) {
  const landmassPrng = createPrng(params.seed).fork("landmass");
  const landmass = generateLandmass(params, {
    prng: landmassPrng,
    onProgress: () => {},
  });
  const climatePrng = createPrng(params.seed).fork("climate");
  const climate = generateClimate(params, landmass, {
    prng: climatePrng,
    onProgress: () => {},
  });
  const resourcesPrng = createPrng(params.seed).fork("resources");
  const resources = generateResources(params, climate, landmass, {
    prng: resourcesPrng,
    onProgress: () => {},
  });
  return { landmass, climate, resources };
}

function fixtureFor(rid: ResourceDefId) {
  return RESOURCE_FIXTURE.find((f) => f.id === rid);
}

describe("generateResources", () => {
  it("determinism: same seed produces byte-identical resourceDefId", () => {
    const params = makeParams();
    const r1 = runResources(params);
    const r2 = runResources(params);
    expect(r1.resources.resourceDefId).toEqual(r2.resources.resourceDefId);
  });

  it("resourceDefId array length matches width * height", () => {
    const params = makeParams({ mapSize: "tiny" });
    const { landmass, resources } = runResources(params);
    expect(resources.resourceDefId.length).toBe(landmass.width * landmass.height);
  });

  it("every ocean tile (isLand=false) gets null", () => {
    const params = makeParams();
    const { landmass, resources } = runResources(params);
    for (let i = 0; i < landmass.isLand.length; i++) {
      if (!landmass.isLand[i]) {
        expect(resources.resourceDefId[i]).toBeNull();
      }
    }
  });

  it("every non-null resourceDefId is on a valid terrain for that resource", () => {
    const params = makeParams();
    const { landmass, climate, resources } = runResources(params);
    for (let i = 0; i < landmass.isLand.length; i++) {
      const rid = resources.resourceDefId[i]!;
      if (rid !== null) {
        const fixture = fixtureFor(rid);
        expect(fixture).toBeDefined();
        expect(fixture!.validOnTerrains).toContain(climate.terrainDefId[i]);
      }
    }
  });

  it("no non-null resourceDefId sits on a water tile", () => {
    const params = makeParams();
    const { landmass, resources } = runResources(params);
    for (let i = 0; i < landmass.isLand.length; i++) {
      if (!landmass.isLand[i]) {
        expect(resources.resourceDefId[i]).toBeNull();
      }
    }
  });

  it("minimum spacing holds for same resource id on standard map", () => {
    const params = makeParams({ seed: 42, mapSize: "standard" });
    const { landmass, resources } = runResources(params);
    const placed: Record<string, Array<[number, number]>> = {};
    const { width } = landmass;

    for (let i = 0; i < landmass.isLand.length; i++) {
      const rid = resources.resourceDefId[i]!;
      if (rid !== null) {
        const r = Math.floor(i / width);
        const q = i % width;
        const arr = placed[rid] ?? [];
        arr.push([r, q]);
        placed[rid] = arr;
      }
    }

    for (const [rid, positions] of Object.entries(placed)) {
      const fixture = fixtureFor(rid as ResourceDefId);
      expect(fixture).toBeDefined();
      const minSpacing = fixture!.minSpacing;
      for (let a = 0; a < positions.length; a++) {
        for (let b = a + 1; b < positions.length; b++) {
          const [r1, q1] = positions[a]!;
          const [r2, q2] = positions[b]!;
          const dr = Math.abs(r1 - r2);
          const dq = Math.abs(q1 - q2);
          expect(Math.max(dr, dq)).toBeGreaterThanOrEqual(minSpacing);
        }
      }
    }
  });

  it("at least one resource of each ResourceClass on standard map", () => {
    const params = makeParams({ seed: 42, mapSize: "standard" });
    const { resources } = runResources(params);
    const found = new Set<string>();
    for (const rid of resources.resourceDefId) {
      if (rid !== null) {
        const fixture = fixtureFor(rid);
        if (fixture) found.add(fixture.resourceClass);
      }
    }
    expect(found).toContain("bonus");
    expect(found).toContain("strategic");
    expect(found).toContain("luxury");
  });

  it("every non-null entry is one of the known resource ids", () => {
    const params = makeParams();
    const { resources } = runResources(params);
    const knownIds = new Set(RESOURCE_FIXTURE.map((f) => f.id));
    for (const rid of resources.resourceDefId) {
      if (rid !== null) {
        expect(knownIds.has(rid)).toBe(true);
      }
    }
  });
});
