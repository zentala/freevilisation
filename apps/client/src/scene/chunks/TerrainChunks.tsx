import type { AxialCoord, TerrainDefId } from "@freevilisation/engine";
import { useMemo } from "react";
import * as THREE from "three";
import { axialToWorld } from "../hexMath";
import { wrapOffsets } from "../wraparound";
import { ChunkRegistry } from "./ChunkRegistry";
import { chunkBoundsBox } from "./chunkFrustum";

export interface TerrainChunksProps {
  readonly coordinates?: readonly AxialCoord[];
  readonly tiles?: readonly TerrainTile[];
  readonly isWraparoundX?: boolean;
  readonly mapWidth?: number;
}

export interface TerrainTile {
  readonly coord: AxialCoord;
  readonly terrainDefId: TerrainDefId;
  readonly improvementDefId?: string | null;
  readonly borderMask?: number;
  /** Visibility values mirror DATA-MODEL.md: unexplored, explored, visible. */
  readonly visibility?: VisibilityState;
}

export enum VisibilityState {
  Unexplored = 0,
  Explored = 1,
  Visible = 2,
}

export interface TerrainBatch {
  readonly key: string;
  readonly chunkKey: string;
  readonly terrainDefId: TerrainDefId;
  readonly tiles: readonly TerrainTile[];
}

const HEX_RADIUS = 1;
const TERRAIN_COLORS: Record<string, number> = {
  terrain_coast: 0x6da9d2,
  terrain_desert: 0xd7b56d,
  terrain_grassland: 0x75a85a,
  terrain_ocean: 0x34699a,
  terrain_plains: 0x9db86a,
  terrain_snow: 0xe6edf2,
  terrain_tundra: 0x859b9b,
};

const EXPLORED_DARKENING = 0.35;

/** Returns the instance tint for a tile's visibility bucket. */
export function visibilityTint(state: VisibilityState = VisibilityState.Visible): THREE.Color {
  const tint = new THREE.Color(0xffffff);
  if (state === VisibilityState.Explored) tint.multiplyScalar(EXPLORED_DARKENING);
  return tint;
}

/** Unexplored tiles are omitted so their terrain and contents are not drawn. */
export function visibleTerrainTiles(tiles: readonly TerrainTile[]): readonly TerrainTile[] {
  return tiles.filter((tile) => tile.visibility !== VisibilityState.Unexplored);
}

function defaultTiles(coordinates: readonly AxialCoord[]): readonly TerrainTile[] {
  return coordinates.map((coord) => ({ coord, terrainDefId: "terrain_grassland" as TerrainDefId }));
}

/** Groups input tiles deterministically by chunk and terrain definition. */
export function buildTerrainBatches(tiles: readonly TerrainTile[]): readonly TerrainBatch[] {
  const registry = new ChunkRegistry();
  const groups = new Map<string, TerrainTile[]>();
  for (const tile of visibleTerrainTiles(tiles)) {
    const chunkKey = registry.ensure(tile.coord).key;
    const key = `${chunkKey}:${tile.terrainDefId}`;
    const group = groups.get(key) ?? [];
    group.push(tile);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    chunkKey: key.slice(0, key.lastIndexOf(":")),
    terrainDefId: group[0]!.terrainDefId,
    tiles: group,
  }));
}

function createMesh(
  tiles: readonly TerrainTile[],
  bounds: ReturnType<ChunkRegistry["ensure"]>["bounds"],
): THREE.InstancedMesh {
  const geometry = new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, 0.2, 6);
  const terrain = tiles[0]?.terrainDefId as string;
  const material = new THREE.MeshStandardMaterial({
    color: TERRAIN_COLORS[terrain] ?? 0x888888,
    vertexColors: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
  const matrix = new THREE.Matrix4();
  for (const [index, tile] of tiles.entries()) {
    const position = axialToWorld(tile.coord);
    matrix.makeTranslation(position.x, position.y, position.z);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, visibilityTint(tile.visibility));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  const chunkBox = chunkBoundsBox(bounds);
  mesh.geometry.boundingBox = chunkBox;
  mesh.geometry.boundingSphere = chunkBox.getBoundingSphere(new THREE.Sphere());
  mesh.userData.terrainDefId = terrain;
  return mesh;
}

/**
 * Patches the matrix for one tile without rebuilding its InstancedMesh.
 * The caller owns batch membership; this is intentionally a small render
 * primitive so terrain, improvement, and border events share the same path.
 */
export function updateTerrainBatchMatrix(
  mesh: THREE.InstancedMesh,
  tiles: readonly TerrainTile[],
  coord: AxialCoord,
): boolean {
  const index = tiles.findIndex((tile) => tile.coord.q === coord.q && tile.coord.r === coord.r);
  if (index < 0) return false;
  const position = axialToWorld(coord);
  mesh.setMatrixAt(index, new THREE.Matrix4().makeTranslation(position.x, position.y, position.z));
  mesh.instanceMatrix.needsUpdate = true;
  return true;
}

/** Updates only the batch containing a changed tile and records its chunk. */
export class TerrainBatchUpdater {
  private readonly registry = new ChunkRegistry();

  constructor(private readonly batches: readonly TerrainBatchTarget[]) {
    for (const batch of batches) {
      for (const tile of batch.tiles) this.registry.ensure(tile.coord);
    }
    this.registry.consumeDirty();
  }

  update(coord: AxialCoord): boolean {
    this.registry.markDirty(coord);
    const target = this.batches.find((batch) =>
      batch.tiles.some((tile) => tile.coord.q === coord.q && tile.coord.r === coord.r),
    );
    return target ? updateTerrainBatchMatrix(target.mesh, target.tiles, coord) : false;
  }

  consumeDirtyChunks(): readonly string[] {
    return this.registry.consumeDirty();
  }
}

export interface TerrainBatchTarget {
  readonly mesh: THREE.InstancedMesh;
  readonly tiles: readonly TerrainTile[];
}

/** Renders one raw InstancedMesh for each terrain/chunk pair. */
export function TerrainChunks({
  coordinates = [],
  tiles,
  isWraparoundX = false,
  mapWidth = 1,
}: TerrainChunksProps) {
  const meshes = useMemo(() => {
    const source = tiles ?? defaultTiles(coordinates);
    const registry = new ChunkRegistry();
    return buildTerrainBatches(source).map(({ key, tiles: batchTiles }) => ({
      key,
      mesh: createMesh(batchTiles, registry.ensure(batchTiles[0]!.coord).bounds),
    }));
  }, [coordinates, tiles]);

  return (
    <group>
      {meshes.flatMap(({ key, mesh }) =>
        wrapOffsets(isWraparoundX, mapWidth).map((offset) => (
          <primitive
            key={`${key}:${offset}`}
            object={offset === 0 ? mesh : mesh.clone()}
            position={[offset, 0, 0]}
          />
        )),
      )}
    </group>
  );
}
