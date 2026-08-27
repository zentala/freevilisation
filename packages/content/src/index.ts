export const CONTENT_PACKAGE = "@freevilisation/content" as const;

export {
  AssetRegistry,
  assetManifestEntrySchema,
  assetManifestSchema,
  primitiveShapeSchema,
  primitiveSpecSchema,
} from "./assets/manifest.js";
export type {
  AssetManifest,
  AssetManifestEntry,
  PrimitiveShape,
  PrimitiveSpec,
} from "./assets/manifest.js";
export { validateAssetManifest } from "./assets/manifestValidation.js";
export type { ManifestValidationOptions } from "./assets/manifestValidation.js";
