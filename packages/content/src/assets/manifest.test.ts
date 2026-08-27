import { describe, expect, it } from "vitest";
import {
  AssetRegistry,
  assetManifestSchema,
  primitiveSpecSchema,
} from "./manifest";

const primitive = {
  shapes: [{ kind: "box" as const, scale: [1, 2, 1] as [number, number, number] }],
};

describe("asset manifest schema", () => {
  it("parses all supported placeholder tiers", () => {
    const result = assetManifestSchema.parse({
      "unit.warrior": { tier: "T0", icon: "warrior", palette: ["#334455"] },
      "building.granary": { tier: "T1", primitive },
      "wonder.pyramids": { tier: "model", icon: "pyramids" },
    });

    expect(result["unit.warrior"]?.tier).toBe("T0");
    expect(result["building.granary"]?.primitive).toEqual(primitive);
  });

  it("rejects malformed primitive shapes and unknown fields", () => {
    expect(() => primitiveSpecSchema.parse({ shapes: [] })).toThrow();
    expect(() =>
      assetManifestSchema.parse({ item: { tier: "T0", unexpected: true } }),
    ).toThrow();
  });

  it("rejects invalid tiers and empty asset references", () => {
    expect(() => assetManifestSchema.parse({ item: { tier: "T2" } })).toThrow();
    expect(() => assetManifestSchema.parse({ item: { tier: "T0", icon: "" } })).toThrow();
  });
});

describe("AssetRegistry", () => {
  it("resolves entries and does not expose unknown definitions", () => {
    const entry = { tier: "T0" as const, icon: "warrior" };
    const registry = new AssetRegistry({ "unit.warrior": entry });

    expect(registry.resolve("unit.warrior")).toEqual(entry);
    expect(registry.has("unit.warrior")).toBe(true);
    expect(registry.resolve("unit.unknown")).toBeUndefined();
    expect(registry.has("unit.unknown")).toBe(false);
  });
});
