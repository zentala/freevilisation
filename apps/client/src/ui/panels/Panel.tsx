import { useEffect, useRef, type ReactNode } from "react";
import { usePanelFocus } from "./usePanelFocus";

export type PanelMode = "dialog" | "popover";

export interface PanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly mode?: PanelMode;
  readonly className?: string;
  readonly describedBy?: string;
}

const panelBase =
  "relative w-full max-w-lg rounded-lg border border-slate-600 bg-slate-900 p-4 text-slate-100 shadow-2xl outline-none";

/** Shared non-draggable panel shell for modal dialogs and anchored popovers. */
export function Panel({
  open,
  onOpenChange,
  title,
  children,
  mode = "dialog",
  className = "",
  describedBy,
}: PanelProps) {
  const { panelRef, zIndexRef } = usePanelFocus(open);
  const backdropZIndexRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (zIndexRef.current !== null && backdropZIndexRef.current) {
      backdropZIndexRef.current.style.zIndex = String(zIndexRef.current - 1);
    }
  }, [zIndexRef]);

  if (!open) return null;

  const dialog = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={mode === "dialog" ? true : undefined}
      aria-labelledby="panel-title"
      aria-describedby={describedBy}
      tabIndex={-1}
      data-state="open"
      data-panel-mode={mode}
      className={`${panelBase} animate-in fade-in zoom-in-95 ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <h2 id="panel-title" className="text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close panel"
          className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={() => onOpenChange(false)}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );

  if (mode === "popover") {
    return (
      <div
        className="fixed inset-0 flex items-start justify-center p-4 pointer-events-none"
        ref={backdropZIndexRef}
      >
        <div className="pointer-events-auto">{dialog}</div>
      </div>
    );
  }

  return (
    <div
      ref={backdropZIndexRef}
      className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-4 animate-in fade-in"
      data-panel-backdrop="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      {dialog}
    </div>
  );
}
