import { describe, it, expect } from "vitest";
import { neighbors, distance } from "@freevilisation/engine";
import { generateStartPositions } from "./start-positions.js";
import { TERRAIN } from "./climate.js";
import { wrapContextFor, scriptedPrng } from "./start-positions.test-fixtures.js";

describe("wraparound geometry (east-west seam)", () => {
  it("an east-edge tile has a hex neighbour on the west edge on a wrapping map, not on a flat one", () => {
    const width = 8;
    const eastEdge = { q: width - 1, r: 3 };
    const wrapping = wrapContextFor("continents", width);
    const flat = wrapContextFor("archipelago", width);

    const wrappingNeighbourQs = neighbors(eastEdge, wrapping).map((n) => n.q);
    const flatNeighbourQs = neighbors(eastEdge, flat).map((n) => n.q);

    expect(wrappingNeighbourQs).toContain(0);
    expect(flatNeighbourQs).not.toContain(0);
  });

  it("spacing measured across the seam is shorter than the long way round", () => {
    const width = 8;
    const westEdge = { q: 0, r: 3 };
    const eastEdge = { q: width - 1, r: 3 };
    const wrapping = wrapContextFor("continents", width);
    const flat = wrapContextFor("archipelago", width);

    const seamDistance = distance(westEdge, eastEdge, wrapping);
    const longWayRound = distance(westEdge, eastEdge, flat);

    expect(seamDistance).toBe(1);
    expect(longWayRound).toBe(width - 1);
    expect(seamDistance).toBeLessThan(longWayRound);
  });

  it("generateStartPositions honours the seam: a resource on the west edge also lifts the east edge's score", () => {
    // A one-row, 4-wide wrapping map. A resource at q=0 is a real hex neighbour
    // of both q=1 (plain adjacency) and, via the wrap, q=3 (east edge wrapping
    // to west edge). Both q=1 and q=3 clear the relaxed floor and become the
    // exact 2-tile pool for 2 players — on a flat map q=3 would never see the
    // bonus and the fallback pool would be the whole strip instead.
    const width = 4;
    const terrainDefId = new Array(width).fill(TERRAIN.desert);
    const resourceDefId = new Array(width).fill(null);
    resourceDefId[0] = "resource_probe";

    const { startPositions } = generateStartPositions(
      { seed: 1, mapType: "continents", mapSize: "tiny", numPlayers: 2 },
      {
        width,
        height: 1,
        elevation: new Array(width).fill(1),
        isLand: new Array(width).fill(true),
      },
      { terrainDefId } as never,
      { resourceDefId } as never,
      { prng: scriptedPrng([0]), onProgress: () => {} },
    );

    expect(startPositions).toEqual([
      { q: 1, r: 0 },
      { q: 3, r: 0 },
    ]);
  });
});
