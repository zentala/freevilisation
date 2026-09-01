import type { ReactNode } from "react";

export interface HudLayoutProps {
  readonly topBar?: ReactNode;
  readonly bottomPanel?: ReactNode;
  readonly rightColumn?: ReactNode;
}

/** DOM overlay for HUD regions; the 3D canvas remains a sibling underneath it. */
export function HudLayout({
  topBar = null,
  bottomPanel = null,
  rightColumn = null,
}: HudLayoutProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 grid md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[auto_minmax(0,1fr)_auto] grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto_auto]"
      data-testid="hud-layout"
    >
      <section
        aria-label="Top bar"
        className="pointer-events-none md:col-span-2 col-span-1 row-start-1"
      >
        <div className="pointer-events-auto">{topBar}</div>
      </section>
      <section
        aria-label="Bottom panel"
        className="pointer-events-none md:col-start-1 col-start-1 md:row-start-3 row-start-3"
      >
        <div className="pointer-events-auto">{bottomPanel}</div>
      </section>
      <section
        aria-label="Notifications"
        className="pointer-events-none md:col-start-2 md:row-span-2 md:row-start-2 col-start-1 row-start-4"
      >
        <div className="pointer-events-auto">{rightColumn}</div>
      </section>
    </div>
  );
}
