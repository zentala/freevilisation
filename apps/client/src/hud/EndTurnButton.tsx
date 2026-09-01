import type { ReactElement } from "react";

export interface EndTurnButtonProps {
  readonly idleUnitCount: number;
  readonly idleUnitIds?: readonly string[];
  readonly onEndTurn: () => void;
  readonly onFocusIdleUnit?: (unitId: string) => void;
  readonly onNotify?: (message: string) => void;
  readonly confirmEndTurnWithIdleUnits?: boolean;
  readonly disabled?: boolean;
  readonly isPlayerTurn?: boolean;
}

/** Bottom-right turn control shared by the HUD and keyboard shortcuts. */
export function EndTurnButton({
  idleUnitCount,
  idleUnitIds = [],
  onEndTurn,
  onFocusIdleUnit,
  onNotify,
  confirmEndTurnWithIdleUnits = true,
  disabled = false,
  isPlayerTurn = true,
}: EndTurnButtonProps): ReactElement {
  const isDisabled = disabled || !isPlayerTurn;
  const handleEndTurn = () => {
    const firstIdleUnit = idleUnitIds[0];
    if (confirmEndTurnWithIdleUnits && firstIdleUnit !== undefined) {
      onFocusIdleUnit?.(firstIdleUnit);
      onNotify?.("Unit needs orders");
      return;
    }
    onEndTurn();
  };
  return (
    <div className="pointer-events-auto fixed bottom-2 right-2 sm:bottom-6 sm:right-6 z-10">
      <button
        type="button"
        aria-label="End turn"
        disabled={isDisabled}
        onClick={handleEndTurn}
        className="relative rounded-lg bg-amber-500 px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="hidden sm:inline">End turn</span>
        <span className="sm:hidden">End</span>
        {idleUnitCount > 0 && (
          <span
            aria-label={`${idleUnitCount} idle units`}
            className="absolute -right-2 -top-2 min-w-6 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white"
          >
            {idleUnitCount}
          </span>
        )}
      </button>
    </div>
  );
}
