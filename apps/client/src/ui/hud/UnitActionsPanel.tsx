import { useUiStore } from "../store/uiStore";

export type UnitOrderKind =
  "move" | "attack" | "build" | "fortify" | "sentry" | "skip" | "sleep" | "disband";

export interface UnitDefForActions {
  readonly id: string;
  readonly name?: string;
  readonly effects?: readonly string[];
  readonly availableOrders: readonly UnitOrderKind[];
}

export interface SelectedUnitForActions {
  readonly id: string;
  readonly def: UnitDefForActions;
}

export interface UnitActionsPanelProps {
  readonly selectedUnit?: SelectedUnitForActions | null;
  readonly onOrder: (order: UnitOrderKind, unitId: string) => void;
  readonly className?: string;
}

const ORDER_LABELS: Record<UnitOrderKind, string> = {
  move: "Move",
  attack: "Attack",
  build: "Build",
  fortify: "Fortify",
  sentry: "Sentry",
  skip: "Skip",
  sleep: "Sleep",
  disband: "Disband",
};

export function getAvailableUnitActions(def: UnitDefForActions): readonly UnitOrderKind[] {
  return [...new Set(def.availableOrders)];
}

/** Bottom HUD action strip generated from the selected unit definition. */
export function UnitActionsPanel({
  selectedUnit = null,
  onOrder,
  className = "",
}: UnitActionsPanelProps) {
  const selectedIntent = useUiStore((state) => state.selected);
  const unit = selectedUnit ?? null;
  if (!unit || (selectedIntent && selectedIntent.kind !== "unit")) return null;

  const actions = getAvailableUnitActions(unit.def);
  return (
    <section
      aria-label="Unit actions"
      className={`rounded-lg bg-slate-900/90 p-2 sm:p-3 text-slate-100 shadow-xl ${className}`}
    >
      <div className="mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h2 className="font-semibold text-sm sm:text-base truncate">{unit.def.name ?? unit.def.id}</h2>
        {unit.def.effects && unit.def.effects.length > 0 ? (
          <span className="text-xs text-slate-400" aria-label="Unit effects">
            {unit.def.effects.join(" · ")}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1 sm:gap-2">
        {actions.map((order) => (
          <button
            key={order}
            type="button"
            aria-label={`${ORDER_LABELS[order]} unit`}
            className="rounded bg-amber-500 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-slate-950 hover:bg-amber-400 flex-1 sm:flex-none"
            onClick={() => onOrder(order, unit.id)}
          >
            {ORDER_LABELS[order]}
          </button>
        ))}
      </div>
    </section>
  );
}
