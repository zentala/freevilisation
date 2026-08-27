import type { CityId, UnitId } from "@freevilisation/engine";
import { useGameViewStore } from "../gameViewStore";

export function healthRatio(current: number, maximum: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.max(0, Math.min(1, current / maximum));
}

export function HealthBar({ entityId, kind, maximum = kind === "unit" ? 100 : 100 }: { readonly entityId: UnitId | CityId; readonly kind: "unit" | "city"; readonly maximum?: number }) {
  const value = useGameViewStore((view) => {
    if (kind === "unit") return view.gameState?.entities.units[entityId as UnitId]?.hp;
    return view.gameState?.entities.cities[entityId as CityId]?.health;
  });
  const ratio = healthRatio(value ?? maximum, maximum);
  return <group position={[0, 1.35, 0]} userData={{ entityId, kind }}><mesh position={[(ratio - 1) * 0.3, 0, 0.01]} scale={[0.6 * ratio, 0.08, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444} /></mesh><mesh scale={[0.6, 0.08, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial color={0x1e293b} transparent opacity={0.8} /></mesh></group>;
}
