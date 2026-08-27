import { describe, expect, it } from "vitest";
import { validateAssetManifest } from "./manifestValidation";

const defs = ["unit.warrior", "building.granary"];
const icons = new Set(["warrior"]);
const validManifest = {
  "unit.warrior": { tier: "T0" as const, icon: "warrior" },
  "building.granary": {
    tier: "T1" as const,
    primitive: { shapes: [{ kind: "box" as const }] },
  },
};

describe("ruleset asset manifest validation", () => {
  it("accepts a complete base manifest", () => {
    expect(validateAssetManifest(validManifest, { defIds: defs, iconRefs: icons })).toEqual(
      validManifest,
    );
  });

  it("rejects an entry for an unknown definition", () => {
    expect(() =>
      validateAssetManifest(
        { ...validManifest, "unit.missing": { tier: "T0", icon: "warrior" } },
        { defIds: defs, iconRefs: icons },
      ),
    ).toThrow('unknown defId "unit.missing"');
  });

  it("rejects a missing definition entry", () => {
    expect(() =>
      validateAssetManifest(
        { "unit.warrior": validManifest["unit.warrior"] },
        { defIds: defs, iconRefs: icons },
      ),
    ).toThrow('missing manifest entry for defId "building.granary"');
  });

  it("rejects a T0 entry without an icon reference", () => {
    expect(() =>
      validateAssetManifest(
        { ...validManifest, "unit.warrior": { tier: "T0" } },
        { defIds: defs, iconRefs: icons },
      ),
    ).toThrow('missing icon reference for T0 defId "unit.warrior"');
  });

  it("rejects an icon that is absent from the atlas lookup", () => {
    expect(() =>
      validateAssetManifest(
        { ...validManifest, "unit.warrior": { tier: "T0", icon: "unknown" } },
        { defIds: defs, iconRefs: icons },
      ),
    ).toThrow('unknown icon reference "unknown"');
  });
});
