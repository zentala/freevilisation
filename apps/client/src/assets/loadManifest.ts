import {
  AssetRegistry,
  assetManifestSchema,
  type AssetManifest,
} from "@freevilisation/content";
import manifestJson from "./manifest.json";

type ManifestModule = { default?: unknown } | unknown;

/** The small part of Vite's HMR API used by the manifest loader. */
export interface ManifestHotContext {
  accept(
    dependency: string,
    callback: (module: ManifestModule) => void,
  ): void;
}

export interface ManifestLoader {
  get registry(): AssetRegistry;
  reload(manifest: unknown): AssetRegistry;
}

const viteHot = (import.meta as ImportMeta & { hot?: ManifestHotContext }).hot;

function manifestFromModule(module: ManifestModule): unknown {
  if (
    typeof module === "object" &&
    module !== null &&
    "default" in module
  ) {
    return module.default;
  }
  return module;
}

/** Parse a manifest at the application boundary before it reaches renderers. */
export function loadManifest(manifest: unknown): AssetRegistry {
  const parsed: AssetManifest = assetManifestSchema.parse(manifest);
  return new AssetRegistry(parsed);
}

/**
 * Create a registry and install Vite's dependency HMR handler when available.
 * The callback receives the new registry, so consumers can replace their
 * store reference without reloading the page.
 */
export function createManifestLoader(
  onReload?: (registry: AssetRegistry) => void,
  hot: ManifestHotContext | undefined = viteHot,
): ManifestLoader {
  let registry = loadManifest(manifestJson);

  const reload = (manifest: unknown): AssetRegistry => {
    registry = loadManifest(manifest);
    onReload?.(registry);
    return registry;
  };

  hot?.accept("./manifest.json", (module) => {
    reload(manifestFromModule(module));
  });

  return {
    get registry() {
      return registry;
    },
    reload,
  };
}

export const assetRegistry = createManifestLoader().registry;
