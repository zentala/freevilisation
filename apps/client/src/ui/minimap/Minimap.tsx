import type { AssetRegistry } from "@freevilisation/content";
import { fromHexKey, type AxialCoord, type GameMap } from "@freevilisation/engine";
import { useEffect, useRef, useState } from "react";
import { axialToWorld } from "../../scene/hexMath";

export interface MinimapViewport {
  readonly minQ: number;
  readonly maxQ: number;
  readonly minR: number;
  readonly maxR: number;
}

export interface MinimapCameraTarget {
  readonly x: number;
  readonly z: number;
}

export interface MinimapProps {
  readonly map: GameMap;
  readonly registry: AssetRegistry;
  readonly viewport: MinimapViewport;
  readonly onCameraMove: (target: MinimapCameraTarget) => void;
  readonly width?: number;
  readonly height?: number;
}

export const DEFAULT_MINIMAP_WIDTH = 180;
export const DEFAULT_MINIMAP_HEIGHT = 120;
const FALLBACK_TERRAIN_COLOR = "#777777";

export function terrainColor(registry: AssetRegistry, terrainDefId: string): string {
  return registry.resolve(terrainDefId)?.palette?.[0] ?? FALLBACK_TERRAIN_COLOR;
}

export function canvasPointToAxial(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  map: Pick<GameMap, "width" | "height">,
): AxialCoord {
  const q = Math.floor(((clientX - rect.left) / rect.width) * map.width);
  const r = Math.floor(((clientY - rect.top) / rect.height) * map.height);
  return {
    q: Math.max(0, Math.min(map.width - 1, q)),
    r: Math.max(0, Math.min(map.height - 1, r)),
  };
}

export function viewportBox(
  viewport: MinimapViewport,
  map: Pick<GameMap, "width" | "height">,
  width: number,
  height: number,
) {
  return {
    x: (viewport.minQ / map.width) * width,
    y: (viewport.minR / map.height) * height,
    width: ((viewport.maxQ - viewport.minQ) / map.width) * width,
    height: ((viewport.maxR - viewport.minR) / map.height) * height,
  };
}

export function cameraTargetFor(coord: AxialCoord): MinimapCameraTarget {
  const world = axialToWorld(coord);
  return { x: world.x, z: world.z };
}

function drawMinimap(
  context: CanvasRenderingContext2D,
  map: GameMap,
  registry: AssetRegistry,
  viewport: MinimapViewport,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);
  const tileWidth = width / map.width;
  const tileHeight = height / map.height;
  for (const tile of Object.values(map.tiles)) {
    const coord = fromHexKey(tile.hexKey);
    context.fillStyle = terrainColor(registry, tile.terrainDefId);
    context.fillRect(coord.q * tileWidth, coord.r * tileHeight, tileWidth + 1, tileHeight + 1);
  }
  const box = viewportBox(viewport, map, width, height);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1;
  context.strokeRect(box.x, box.y, box.width, box.height);
}

/** Compact canvas map that recentres the 3D camera when clicked or dragged. */
export function Minimap({
  map,
  registry,
  viewport,
  onCameraMove,
  width = DEFAULT_MINIMAP_WIDTH,
  height = DEFAULT_MINIMAP_HEIGHT,
}: MinimapProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context) drawMinimap(context, map, registry, viewport, width, height);
  }, [map, registry, viewport, width, height]);

  const moveCamera = (clientX: number, clientY: number) => {
    const element = canvas.current;
    if (!element) return;
    const coord = canvasPointToAxial(clientX, clientY, element.getBoundingClientRect(), map);
    onCameraMove(cameraTargetFor(coord));
  };

  return (
    <canvas
      ref={canvas}
      aria-label="Minimap"
      className="cursor-crosshair border border-white/70 bg-black/40"
      data-testid="minimap"
      height={height}
      width={width}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        moveCamera(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (dragging) moveCamera(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
      onPointerCancel={() => setDragging(false)}
    />
  );
}
