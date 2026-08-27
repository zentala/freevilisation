import { assetManifestSchema, type AssetManifest } from "./manifest.js";

export interface ManifestValidationOptions {
  readonly defIds: readonly string[];
  readonly iconRefs?: ReadonlySet<string>;
}

/**
 * Parses a ruleset asset manifest and verifies that it covers the ruleset
 * definitions supplied by the loader.
 */
export function validateAssetManifest(
  input: unknown,
  options: ManifestValidationOptions,
): AssetManifest {
  const manifest = assetManifestSchema.parse(input);
  const expected = new Set(options.defIds);
  const issues: string[] = [];

  for (const defId of expected) {
    if (!Object.prototype.hasOwnProperty.call(manifest, defId)) {
      issues.push(`missing manifest entry for defId "${defId}"`);
    }
  }

  for (const [defId, entry] of Object.entries(manifest)) {
    if (!expected.has(defId)) {
      issues.push(`unknown defId "${defId}"`);
    }
    if (entry.tier === "T0" && !entry.icon) {
      issues.push(`missing icon reference for T0 defId "${defId}"`);
    }
    if (entry.icon && options.iconRefs && !options.iconRefs.has(entry.icon)) {
      issues.push(`unknown icon reference "${entry.icon}" for defId "${defId}"`);
    }
  }

  if (issues.length > 0) {
    throw new Error(`Asset manifest validation failed:\n${issues.join("\n")}`);
  }
  return manifest;
}
