import { useEffect, useSyncExternalStore } from "react";
import type { NotificationQueue, NotificationToast } from "./NotificationQueue";

export interface ToastStackProps {
  readonly queue: NotificationQueue;
  readonly dismissAfterMs?: number;
}

/** Dismissible overlay stack intended for HudLayout's right-column region. */
export function ToastStack({ queue, dismissAfterMs = 5_000 }: ToastStackProps) {
  const toasts = useSyncExternalStore(
    queue.subscribe.bind(queue),
    () => queue.toasts,
    () => queue.toasts,
  );

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => queue.dismiss(toast.id), dismissAfterMs),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [dismissAfterMs, queue, toasts]);

  return (
    <ol aria-label="Notification toasts" className="flex w-80 flex-col gap-2 p-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => queue.dismiss(toast.id)} />
      ))}
    </ol>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  readonly toast: NotificationToast;
  readonly onDismiss: () => void;
}) {
  return (
    <li
      className={`pointer-events-auto rounded-md border p-3 shadow-lg ${toneClass(toast.tone)}`}
      data-tone={toast.tone}
      data-toast-id={toast.id}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm">{toast.message}</p>
        <button
          aria-label={`Dismiss ${toast.message}`}
          className="text-lg leading-none"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      </div>
    </li>
  );
}

function toneClass(tone: NotificationToast["tone"]): string {
  const classes: Record<NotificationToast["tone"], string> = {
    info: "border-sky-400 bg-slate-900 text-slate-100",
    success: "border-emerald-400 bg-slate-900 text-slate-100",
    warning: "border-amber-400 bg-slate-900 text-slate-100",
    error: "border-red-400 bg-slate-900 text-slate-100",
  };
  return classes[tone];
}
