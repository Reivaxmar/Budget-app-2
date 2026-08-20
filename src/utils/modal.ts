import type { MouseEvent } from 'react';

/**
 * Click-outside-to-dismiss for the app's `.modal-overlay` pattern: clicking
 * the dimmed backdrop closes the modal exactly as pressing Cancel would.
 * Checks `target === currentTarget` (not just "did this handler fire") so a
 * click that starts inside the modal content and bubbles up doesn't also
 * count as an outside click.
 */
export function closeOnOverlayClick(onClose: () => void) {
  return (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
}
