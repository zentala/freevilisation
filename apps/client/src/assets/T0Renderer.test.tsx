import { AssetRegistry } from "@freevilisation/content";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { resolveIconUv, resolveT0Tint } from "./T0Renderer";

const registry = new AssetRegistry({
  "unit.warrior": { tier: "T0", icon: "warrior" },
});

describe("T0 renderer helpers", () => {
  it("multiplies terrain and owner colors", () => {
    expect(resolveT0Tint(0xffffff, 0xff0000).getHex()).toBe(0xff0000);
    expect(resolveT0Tint(0x336699).getHex()).toBe(0x336699);
  });

  it("resolves the manifest icon to atlas UV metadata", () => {
    const uv = { x: 0, y: 0, width: 64, height: 64, u0: 0, v0: 0, u1: 0.5, v1: 1 };
    expect(resolveIconUv(registry, "unit.warrior", { width: 128, height: 64, icons: { warrior: uv } })).toBe(uv);
    expect(resolveIconUv(registry, "unit.unknown", { width: 128, height: 64, icons: {} })).toBeUndefined();
  });

  it("keeps icon atlas sampling scoped to a cloned texture", () => {
    const texture = new THREE.Texture();
    const clone = texture.clone();
    expect(clone).not.toBe(texture);
  });
});
