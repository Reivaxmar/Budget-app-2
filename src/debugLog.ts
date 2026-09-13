// Forwards console.error/console.warn to the Rust side (see
// src-tauri/src/lib.rs's `frontend_log` command) so they print to the
// terminal `tauri dev`/the built app runs from, not just the webview's own
// devtools console — which most users never have open, and which isn't
// reachable at all in some release builds. Browser/dev-server runs (`vite`
// without Tauri) are unaffected: the console still logs normally, just
// without the extra forwarding.
import { invoke, isTauri } from '@tauri-apps/api/core';

// Error's own message/stack are non-enumerable, so a plain
// `JSON.stringify(objectContainingAnError)` silently drops them — this
// replacer expands any Error found anywhere in the object graph (not just
// at the top level, e.g. `{ ..., error: err }`) into its own plain,
// enumerable fields first.
function errorReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function serializeArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack || `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === 'string') {
    return arg;
  }
  try {
    return JSON.stringify(arg, errorReplacer, 2);
  } catch {
    return String(arg);
  }
}

export function installTerminalConsoleForwarding(): void {
  if (!isTauri()) {
    return;
  }

  (['error', 'warn'] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      const message = args.map(serializeArg).join(' ');
      // Best-effort — if this itself fails, fall back to the original
      // console method only rather than throwing inside a logging call.
      invoke('frontend_log', { level, message }).catch(() => {});
    };
  });
}
