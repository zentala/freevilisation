import { describe, expect, it, vi } from "vitest";
import { AssetRegistry } from "@freevilisation/content";
import {
  createManifestLoader,
  loadManifest,
  type ManifestHotContext,
} from "./loadManifest";

const entry = { tier: "T0" as const, icon: "warrior" };

describe("loadManifest", () => {
  it("validates a manifest and returns an AssetRegistry", () => {
    const registry = loadManifest({ "unit.warrior": entry });

    expect(registry).toBeInstanceOf(AssetRegistry);
    expect(registry.resolve("unit.warrior")).toEqual(entry);
  });

  it("rejects malformed manifest data at the loader boundary", () => {
    expect(() => loadManifest({ "unit.warrior": { tier: "T2" } })).toThrow();
  });
});

describe("createManifestLoader", () => {
  it("reloads JSON module updates through the Vite HMR hook", () => {
    let callback: ((module: unknown) => void) | undefined;
    const hot: ManifestHotContext = {
      accept: vi.fn((_dependency, next) => {
        callback = next;
      }),
    };
    const onReload = vi.fn();
    const loader = createManifestLoader(onReload, hot);

    expect(hot.accept).toHaveBeenCalledWith("./manifest.json", expect.any(Function));
    callback?.({ default: { "unit.warrior": entry } });

    expect(loader.registry.resolve("unit.warrior")).toEqual(entry);
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("supports direct reloads for tests and non-Vite callers", () => {
    const loader = createManifestLoader(undefined, undefined);
    const registry = loader.reload({ "building.granary": { tier: "T1" } });

    expect(loader.registry).toBe(registry);
    expect(registry.has("building.granary")).toBe(true);
  });
});
