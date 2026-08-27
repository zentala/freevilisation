import { AssetRegistry } from "@freevilisation/content";
import { describe, expect, it } from "vitest";
import { resolveT1Color, resolveT1Spec } from "./T1Compositor";

describe("T1 compositor", () => {
  it("uses the manifest primitive spec when present", () => {
    const registry = new AssetRegistry({
      "building.granary": {
        tier: "T1",
        primitive: { shapes: [{ kind: "box", scale: [2, 3, 4] }] },
      },
    });
    expect(resolveT1Spec(registry, "building.granary")?.shapes[0]?.scale).toEqual([2, 3, 4]);
  });

  it("provides distinct category compositions when a placeholder has no spec", () => {
    const registry = new AssetRegistry({
      "unit.warrior": { tier: "T1" },
      "building.granary": { tier: "T1" },
      "wonder.pyramids": { tier: "T1" },
    });
    const unit = resolveT1Spec(registry, "unit.warrior");
    const building = resolveT1Spec(registry, "building.granary");
    const wonder = resolveT1Spec(registry, "wonder.pyramids");
    expect(new Set([unit?.shapes.length, building?.shapes.length, wonder?.shapes.length]).size).toBe(1);
    expect(unit?.shapes[1]?.kind).toBe("cone");
    expect(building?.shapes[0]?.kind).toBe("box");
    expect(wonder?.shapes[1]?.scale?.[1]).toBeGreaterThan(1);
  });

  it("uses palette before owner color", () => {
    const registry = new AssetRegistry({
      "unit.warrior": { tier: "T1", palette: ["#123456"], primitive: { shapes: [{ kind: "box" }] } },
    });
    expect(resolveT1Color(registry, "unit.warrior", 0xff0000).getHex()).toBe(0x123456);
  });
});
