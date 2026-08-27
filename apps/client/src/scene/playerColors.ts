import * as THREE from "three";

/** Fallback used when a legacy civilization definition has no color. */
export const DEFAULT_PLAYER_COLOR = 0x94a3b8;

export interface CivilizationColor {
  readonly colorHex?: string;
}

/** Resolve a civilization color into a Three.js color without mutating input. */
export function resolvePlayerColor(civ: CivilizationColor | undefined): THREE.Color {
  const value = civ?.colorHex;
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return new THREE.Color(DEFAULT_PLAYER_COLOR);
  return new THREE.Color(value);
}

/** Return the numeric color form accepted by JSX material props. */
export function playerColorNumber(civ: CivilizationColor | undefined): number {
  return resolvePlayerColor(civ).getHex();
}

/** Blend a player color with white for readable icon borders and overlays. */
export function playerColorAccent(civ: CivilizationColor | undefined, amount = 0.2): THREE.Color {
  return resolvePlayerColor(civ).lerp(new THREE.Color(0xffffff), amount);
}
