import { z } from "zod";

/** A primitive piece used by the procedural placeholder renderer. */
export const primitiveShapeSchema = z.object({
  kind: z.enum(["box", "cylinder", "cone"]),
  scale: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]).optional(),
  position: z.tuple([z.number(), z.number(), z.number()]).optional(),
  rotation: z.tuple([z.number(), z.number(), z.number()]).optional(),
});

export type PrimitiveShape = z.infer<typeof primitiveShapeSchema>;

export const primitiveSpecSchema = z.object({
  shapes: z.array(primitiveShapeSchema).min(1),
});

export type PrimitiveSpec = z.infer<typeof primitiveSpecSchema>;

const assetManifestEntryBaseSchema = z.object({
  tier: z.enum(["T0", "T1", "model"]),
  primitive: primitiveSpecSchema.optional(),
  icon: z.string().min(1).optional(),
  palette: z.array(z.string().min(1)).min(1).optional(),
});

export const assetManifestEntrySchema = assetManifestEntryBaseSchema.strict();
export type AssetManifestEntry = z.infer<typeof assetManifestEntrySchema>;

export const assetManifestSchema = z.record(z.string().min(1), assetManifestEntrySchema);
export type AssetManifest = z.infer<typeof assetManifestSchema>;

/** Read-only lookup over a validated, immutable asset manifest. */
export class AssetRegistry {
  private readonly entries: Readonly<AssetManifest>;

  public constructor(manifest: AssetManifest) {
    const parsed = assetManifestSchema.parse(manifest);
    this.entries = Object.freeze({ ...parsed });
  }

  public resolve(defId: string): AssetManifestEntry | undefined {
    return this.entries[defId];
  }

  public has(defId: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.entries, defId);
  }
}
