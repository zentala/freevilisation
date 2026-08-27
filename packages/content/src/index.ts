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
