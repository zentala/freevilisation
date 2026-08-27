import { describe, expect, it } from "vitest";
import type { HexKey } from "@freevilisation/engine";
import { previewPath } from "./pathPreview";

describe("previewPath", () => {
  it("returns no path without a complete hover context", () => {
    expect(previewPath(null, null, "1,1" as HexKey)).toEqual([]);
  });

  it("delegates route selection to the engine", () => {
    const state = {
      map: {
        width: 3,
        height: 3,
        isWraparoundX: false,
        tiles: Object.fromEntries(
          Array.from({ length: 9 }, (_, i) => {
            const q = i % 3;
            const r = Math.floor(i / 3);
            return [`${q},${r}`, { terrainDefId: "terrain_grassland" }];
          }),
        ),
      },
    } as never;
    expect(previewPath(state, "0,0" as HexKey, "1,0" as HexKey)).toEqual(["1,0"]);
  });
});
