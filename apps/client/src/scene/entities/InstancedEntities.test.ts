import { describe, expect, it } from "vitest";
import type { HexKey } from "@freevilisation/engine";
import { groupEntityBuckets } from "./InstancedEntities";

const entity = (id: string, defId: string, visibility: "visible" | "explored") => ({ id, defId, visibility, hexKey: "0,0" as HexKey });

describe("groupEntityBuckets", () => {
  it("creates one stable bucket per kind, definition, and visibility", () => {
    const buckets = groupEntityBuckets("unit", [entity("b", "unit.warrior", "visible"), entity("a", "unit.warrior", "visible"), entity("c", "unit.scout", "visible"), entity("d", "unit.warrior", "explored")]);
    expect(buckets.map((bucket) => bucket.key)).toEqual(["unit:unit.scout:visible", "unit:unit.warrior:explored", "unit:unit.warrior:visible"]);
    expect(buckets[2]!.entities.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
