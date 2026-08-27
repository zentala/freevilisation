import type { AssetRegistry } from "@freevilisation/content";
import { useMemo } from "react";
import * as THREE from "three";

export interface IconAtlasUv {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
}

export interface IconAtlasMetadata {
  readonly width: number;
  readonly height: number;
  readonly icons: Readonly<Record<string, IconAtlasUv>>;
}

export interface T0RendererProps {
  readonly registry: AssetRegistry;
  readonly defId: string;
  readonly terrainColor?: THREE.ColorRepresentation;
  readonly ownerColor?: THREE.ColorRepresentation;
  readonly iconTexture?: THREE.Texture;
  readonly iconAtlas?: IconAtlasMetadata;
  readonly position?: [number, number, number];
  readonly size?: number;
}

const DEFAULT_HEX_COLOR = 0x888888;
const DEFAULT_ICON_COLOR = 0xffffff;

/** Combines terrain and owner colors into the tint used by a T0 tile. */
export function resolveT0Tint(
  terrainColor: THREE.ColorRepresentation = DEFAULT_HEX_COLOR,
  ownerColor?: THREE.ColorRepresentation,
): THREE.Color {
  const tint = new THREE.Color(terrainColor);
  if (ownerColor !== undefined) tint.multiply(new THREE.Color(ownerColor));
  return tint;
}

/** Returns the atlas entry referenced by a manifest entry, if it exists. */
export function resolveIconUv(
  registry: AssetRegistry,
  defId: string,
  atlas?: IconAtlasMetadata,
): IconAtlasUv | undefined {
  const icon = registry.resolve(defId)?.icon;
  return icon && atlas ? atlas.icons[icon] : undefined;
}

function atlasTexture(texture: THREE.Texture, uv: IconAtlasUv | undefined): THREE.Texture {
  const scoped = texture.clone();
  scoped.needsUpdate = true;
  if (!uv) return scoped;
  scoped.repeat.set(uv.u1 - uv.u0, uv.v1 - uv.v0);
  scoped.offset.set(uv.u0, 1 - uv.v1);
  scoped.wrapS = THREE.ClampToEdgeWrapping;
  scoped.wrapT = THREE.ClampToEdgeWrapping;
  return scoped;
}

function T0Icon({
  texture,
  uv,
  size,
  color,
}: {
  readonly texture?: THREE.Texture;
  readonly uv?: IconAtlasUv;
  readonly size: number;
  readonly color: THREE.Color;
}) {
  const scopedTexture = useMemo(
    () => (texture ? atlasTexture(texture, uv) : undefined),
    [texture, uv],
  );
  if (!scopedTexture) return null;
  return (
    <sprite scale={[size * 0.62, size * 0.62, 1]} position={[0, size * 0.6, 0]}>
      <spriteMaterial map={scopedTexture} color={color} transparent depthWrite={false} />
    </sprite>
  );
}

/** Renders the cheapest readable representation of a content definition. */
export function T0Renderer({
  registry,
  defId,
  terrainColor,
  ownerColor,
  iconTexture,
  iconAtlas,
  position = [0, 0, 0],
  size = 1,
}: T0RendererProps) {
  const tint = resolveT0Tint(terrainColor, ownerColor);
  const uv = resolveIconUv(registry, defId, iconAtlas);
  return (
    <group position={position} userData={{ defId, tier: "T0" }}>
      <mesh rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[size, size, size * 0.18, 6]} />
        <meshStandardMaterial color={tint} />
      </mesh>
      <T0Icon
        {...(iconTexture ? { texture: iconTexture } : {})}
        {...(uv ? { uv } : {})}
        size={size}
        color={new THREE.Color(DEFAULT_ICON_COLOR)}
      />
    </group>
  );
}
