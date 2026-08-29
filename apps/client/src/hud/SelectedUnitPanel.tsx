import { useEffect, type ReactElement } from "react";

export interface SelectedUnitPanelProps {
  readonly selectedUnitId: string | null;
  readonly idleUnitCount: number;
  readonly onNextIdleUnit: () => void;
  readonly onSentry: () => void;
  readonly onFortify: () => void;
  readonly onSkip: () => void;
}

export function SelectedUnitPanel({
  selectedUnitId,
  idleUnitCount,
  onNextIdleUnit,
  onSentry,
  onFortify,
  onSkip,
}: SelectedUnitPanelProps): ReactElement {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        onNextIdleUnit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNextIdleUnit]);

  return (
    <section
      aria-label="Selected unit"
      className="pointer-events-auto fixed bottom-6 left-6 z-10 rounded-lg bg-slate-900/90 p-4 text-white shadow-lg"
    >
      <p className="text-xs text-slate-300">{selectedUnitId ?? "No unit selected"}</p>
      <button
        type="button"
        aria-label="Select next idle unit"
        disabled={idleUnitCount === 0}
        onClick={onNextIdleUnit}
        className="mt-2 rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600 disabled:opacity-50"
      >
        Next idle unit
      </button>
      <div className="mt-2 flex gap-1">
        <button
          type="button"
          aria-label="Sentry unit"
          onClick={onSentry}
          className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
        >
          Sentry
        </button>
        <button
          type="button"
          aria-label="Fortify unit"
          onClick={onFortify}
          className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
        >
          Fortify
        </button>
        <button
          type="button"
          aria-label="Skip unit"
          onClick={onSkip}
          className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
        >
          Skip
        </button>
      </div>
    </section>
  );
}
