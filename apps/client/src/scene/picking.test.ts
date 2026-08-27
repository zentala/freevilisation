import type { Entity } from "@freevilisation/engine";
import { Plane, Ray, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";
import { pickHex } from "./picking";

function makeStore(entities: Entity[] = []) {
  return { atHex: vi.fn(() => entities) };
}

describe("pickHex", () => {
  it("resolves a ground ray to an axial coordinate and looks up entities", () => {
    const entities: Entity[] = [];
    const store = makeStore(entities);
    const ray = new Ray(
      new Vector3(Math.sqrt(3) * 3, 10, 6),
      new Vector3(0, -1, 0),
    );

    const result = pickHex(ray, store);

    expect(result?.coord).toEqual({ q: 1, r: 4 });
    expect(result?.hexKey).toBe("1,4");
    expect(result?.entities).toBe(entities);
    expect(store.atHex).toHaveBeenCalledWith("1,4");
    expect(result?.worldPoint).toEqual(
      new Vector3(Math.sqrt(3) * 3, 0, 6),
    );
  });

  it("supports a custom ground plane", () => {
    const store = makeStore();
    const ray = new Ray(new Vector3(0, 10, 0), new Vector3(0, -1, 0));

    const result = pickHex(ray, store, new Plane(new Vector3(0, 1, 0), -3));

    expect(result?.worldPoint.y).toBe(3);
  });

  it("returns null when the ray is parallel to the ground", () => {
    const store = makeStore();
    const ray = new Ray(new Vector3(0, 1, 0), new Vector3(1, 0, 0));

    expect(pickHex(ray, store)).toBeNull();
    expect(store.atHex).not.toHaveBeenCalled();
  });
});
