import type { ReactNode } from "react";

export interface TooltipDefinition {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly yields?: Readonly<Record<string, number>>;
  readonly requirements?: readonly string[];
}

export interface TooltipProps {
  readonly definition: TooltipDefinition;
  readonly children: ReactNode;
}

/** CSS-driven tooltip primitive that works for both mouse hover and keyboard focus. */
export function Tooltip({ definition, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex" data-tooltip-id={definition.id}>
      <span tabIndex={0} aria-describedby={`tooltip-${definition.id}`} className="outline-none">{children}</span>
      <span id={`tooltip-${definition.id}`} role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-slate-950 p-3 text-left text-xs text-white shadow-xl group-hover:block group-focus-within:block">
        <strong className="block text-sm text-amber-300">{definition.name}</strong>
        {definition.description && <span className="mt-1 block text-slate-200">{definition.description}</span>}
        {definition.yields && <YieldList yields={definition.yields} />}
        {definition.requirements && definition.requirements.length > 0 && <RequirementList requirements={definition.requirements} />}
      </span>
    </span>
  );
}

function YieldList({ yields }: { readonly yields: Readonly<Record<string, number>> }) {
  const entries = Object.entries(yields);
  if (entries.length === 0) return null;
  return <span className="mt-2 block"><span className="font-semibold">Yields</span>{entries.map(([name, value]) => <span key={name} className="ml-2">{name}: {value}</span>)}</span>;
}

function RequirementList({ requirements }: { readonly requirements: readonly string[] }) {
  return <span className="mt-2 block"><span className="font-semibold">Requirements</span>{requirements.map((requirement) => <span key={requirement} className="ml-2 block">{requirement}</span>)}</span>;
}
