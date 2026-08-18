// Lightweight, dependency-free toast notifications. A plain pub-sub module
// (rather than React context) so any imperative event handler — in a page,
// a service, anywhere — can call `notify(...)` without needing to thread a
// context/provider down to it. src/components/ToastContainer.tsx is the
// only piece that subscribes and renders.

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener(toasts));
}

/** Subscribes to toast list changes. Returns an unsubscribe function. */
export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

/**
 * Shows a toast that disappears on its own after `durationMs` — no click
 * required, unlike `alert()`/`window.confirm()`.
 */
export function notify(message: string, type: ToastType = 'info', durationMs = 4000): string {
  const id = `toast-${++nextId}`;
  toasts = [...toasts, { id, message, type }];
  emit();
  setTimeout(() => dismissToast(id), durationMs);
  return id;
}
