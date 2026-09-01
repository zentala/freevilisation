import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePanelFocus } from "./usePanelFocus";

describe("usePanelFocus", () => {
  it("allocates unique z-indices for multiple panels", () => {
    const { result: result1 } = renderHook(() => usePanelFocus(true));
    const { result: result2 } = renderHook(() => usePanelFocus(true));

    const zIndex1 = result1.current.zIndexRef.current;
    const zIndex2 = result2.current.zIndexRef.current;

    expect(zIndex1).not.toBeNull();
    expect(zIndex2).not.toBeNull();
    if (zIndex1 && zIndex2) {
      expect(zIndex2).toBeGreaterThan(zIndex1);
    }
  });

  it("clears z-index when panel closes", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => usePanelFocus(isOpen),
      { initialProps: { isOpen: true } },
    );

    expect(result.current.zIndexRef.current).not.toBeNull();

    rerender({ isOpen: false });
    expect(result.current.zIndexRef.current).toBeNull();
  });

  it("returns a ref for the panel element", () => {
    const { result } = renderHook(() => usePanelFocus(true));
    expect(result.current.panelRef).toBeDefined();
    expect(result.current.panelRef.current).toBeNull(); // Not attached to DOM in this test
  });
});
