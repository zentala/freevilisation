import type { Era } from "@freevilisation/engine";
import type { ReactElement } from "react";

export interface TurnIndicatorProps {
  readonly turn: number;
  readonly era: Era;
}

/** Persistent top-bar indicator for the current turn and technology era. */
export function TurnIndicator({ turn, era }: TurnIndicatorProps): ReactElement {
  return (
    <div
      aria-label={`Turn ${turn}, ${era} era`}
      className="pointer-events-auto fixed left-6 top-6 z-10 rounded-lg bg-slate-950/85 px-4 py-2 text-sm text-white shadow-lg"
    >
      <span className="font-semibold">Turn {turn}</span>
      <span aria-hidden="true" className="mx-2 text-slate-400">
        ·
      </span>
      <span className="text-amber-300">{era}</span>
    </div>
  );
}
