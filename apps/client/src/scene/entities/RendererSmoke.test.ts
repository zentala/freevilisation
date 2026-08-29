import React from "react";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { AssetRegistry, type AssetManifest } from "@freevilisation/content";
import type { City, HexKey } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import { CityStructures } from "./CityStructures";
import { Improvement } from "./Improvements";
import { InstancedEntities, type RenderEntity } from "./InstancedEntities";

const manifest: AssetManifest = {
  "unit.warrior": { tier: "T1" },
  "unit.scout": { tier: "T1" },
  "building.granary": { tier: "T1" },
  "wonder.pyramids": { tier: "T1" },
  improvement_farm: { tier: "T1" },
};
const registry = new AssetRegistry(manifest);

function countNodes(tree: unknown, type: string): number {
  if (!Array.isArray(tree)) return 0;
  return tree.reduce((count, node) => {
    if (!node || typeof node !== "object") return count;
    const candidate = node as { type?: string; children?: unknown };
    return count + (candidate.type === type ? 1 : 0) + countNodes(candidate.children, type);
  }, 0);
}

function countInstancedMeshes(tree: unknown): number {
  if (!Array.isArray(tree)) return 0;
  return tree.reduce((count, node) => {
    if (!node || typeof node !== "object") return count;
    const candidate = node as { type?: string; props?: { args?: unknown[] }; children?: unknown };
    const args = candidate.props?.args;
    const isInstanced = candidate.type === "mesh" && Array.isArray(args) && args.length === 3;
    return count + (isInstanced ? 1 : 0) + countInstancedMeshes(candidate.children);
  }, 0);
}

function entities(): RenderEntity[] {
  return [
    { id: "u1", defId: "unit.warrior", hexKey: "0,0" as HexKey, visibility: "visible" },
    { id: "u2", defId: "unit.warrior", hexKey: "1,0" as HexKey, visibility: "visible" },
    { id: "u3", defId: "unit.scout", hexKey: "2,0" as HexKey, visibility: "explored" },
  ];
}

function city(): City {
  return {
    centerTile: "0,1" as HexKey,
    buildings: ["building_granary"],
    wonders: ["wonder_pyramids"],
  } as unknown as City;
}

describe("renderer smoke scenes", () => {
  it("mounts unit and city instanced batches with expected instance counts", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      React.createElement(InstancedEntities, { kind: "unit", entities: entities(), registry }),
    );
    const tree = renderer.toTree();
    const batches = Array.isArray(tree)
      ? tree.filter((node) => node.type === "group")[0]?.children
      : [];
    expect(countInstancedMeshes(tree)).toBe(2);
    expect(countInstancedMeshes(batches)).toBe(2);
    await renderer.unmount();

    const cityRenderer = await ReactThreeTestRenderer.create(
      React.createElement(InstancedEntities, {
        kind: "city",
        entities: entities().slice(0, 2),
        registry,
      }),
    );
    expect(countInstancedMeshes(cityRenderer.toTree())).toBe(1);
    await cityRenderer.unmount();
  });

  it("mounts city structures and terrain improvements", async () => {
    const structureRenderer = await ReactThreeTestRenderer.create(
      React.createElement(CityStructures, { city: city(), registry }),
    );
    expect(countNodes(structureRenderer.toTree(), "group")).toBeGreaterThan(0);
    expect(countNodes(structureRenderer.toTree(), "mesh")).toBeGreaterThanOrEqual(4);
    await structureRenderer.unmount();

    const improvementRenderer = await ReactThreeTestRenderer.create(
      React.createElement(Improvement, {
        registry,
        hexKey: "1,1" as HexKey,
        terrainDefId: "terrain_grassland",
        improvementDefId: "improvement_farm",
      }),
    );
    expect(countNodes(improvementRenderer.toTree(), "mesh")).toBe(1);
    await improvementRenderer.unmount();
  });
});
