import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYER_COLOR, playerColorAccent, playerColorNumber, resolvePlayerColor } from "./playerColors";

describe("player color system", () => {
  it("maps CivDef.colorHex to a stable numeric renderer color", () => {
    expect(playerColorNumber({ colorHex: "#12abef" })).toBe(0x12abef);
    expect(resolvePlayerColor({ colorHex: "#12abef" }).getHexString()).toBe("12abef");
  });

  it("uses a deterministic fallback for absent or malformed colors", () => {
    expect(playerColorNumber(undefined)).toBe(DEFAULT_PLAYER_COLOR);
    expect(playerColorNumber({ colorHex: "red" })).toBe(DEFAULT_PLAYER_COLOR);
  });

  it("provides a readable accent without changing the source color", () => {
    const source = resolvePlayerColor({ colorHex: "#000000" });
    const accent = playerColorAccent({ colorHex: "#000000" });
    expect(accent.getHex()).toBeGreaterThan(source.getHex());
    expect(source.getHex()).toBe(0);
  });
});
