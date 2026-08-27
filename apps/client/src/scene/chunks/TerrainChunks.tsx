import type { AxialCoord, TerrainDefId } from "@freevilisation/engine";
import { useMemo } from "react";
import * as THREE from "three";
import { axialToWorld } from "../hexMath";
import { ChunkRegistry } from "./ChunkRegistry";

export interface TerrainChunksProps {
  readonly coordinates?: readonly AxialCoord[];
  readonly tiles?: readonly TerrainTile[];
}

export interface TerrainTile {
  readonly coord: AxialCoord;
  readonly terrainDefId: TerrainDefId;
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

function defaultTiles(coordinates: readonly AxialCoord[]): readonly TerrainTile[] {
  return coordinates.map((coord) => ({ coord, terrainDefId: "terrain_grassland" as TerrainDefId }));
}

/** Groups input tiles deterministically by chunk and terrain definition. */
export function buildTerrainBatches(tiles: readonly TerrainTile[]): readonly TerrainBatch[] {
  const registry = new ChunkRegistry();
  const groups = new Map<string, TerrainTile[]>();
  for (const tile of tiles) {
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

function createMesh(tiles: readonly TerrainTile[]): THREE.InstancedMesh {
  const geometry = new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, 0.2, 6);
  const terrain = tiles[0]?.terrainDefId as string;
  const material = new THREE.MeshStandardMaterial({ color: TERRAIN_COLORS[terrain] ?? 0x888888 });
  const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
  const matrix = new THREE.Matrix4();
  for (const [index, tile] of tiles.entries()) {
    const position = axialToWorld(tile.coord);
    matrix.makeTranslation(position.x, position.y, position.z);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.terrainDefId = terrain;
  return mesh;
}

/** Renders one raw InstancedMesh for each terrain/chunk pair. */
export function TerrainChunks({ coordinates = [], tiles }: TerrainChunksProps) {
  const meshes = useMemo(() => {
    const source = tiles ?? defaultTiles(coordinates);
    return buildTerrainBatches(source).map(({ key, tiles: batchTiles }) => ({
      key,
      mesh: createMesh(batchTiles),
    }));
  }, [coordinates, tiles]);

  return (
    <group>
      {meshes.map(({ key, mesh }) => (
        <primitive key={key} object={mesh} />
      ))}
    </group>
  );
}
