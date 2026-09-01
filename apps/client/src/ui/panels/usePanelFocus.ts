import { useEffect, useRef } from "react";

let panelZIndex = 100;
const openPanels = new Set<number>();

export function usePanelFocus(isOpen: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const zIndexRef = useRef<number | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (zIndexRef.current !== null) {
        openPanels.delete(zIndexRef.current);
        zIndexRef.current = null;
      }
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
        previouslyFocusedRef.current = null;
      }
      return;
    }

    // Save the previously focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Allocate a new z-index
    zIndexRef.current = ++panelZIndex;
    openPanels.add(zIndexRef.current);

    if (panelRef.current) {
      panelRef.current.style.zIndex = String(zIndexRef.current);
      panelRef.current.focus();
    }

    // Set up focus trap
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (!panelRef.current) return;

      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab
        if (activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        // Tab
        if (activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    if (panelRef.current) {
      panelRef.current.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (panelRef.current) {
        panelRef.current.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [isOpen]);

  return { panelRef, zIndexRef };
}
