import type { MouseEvent } from 'react';

// Overlays on which the current press (mousedown) started directly on the
// backdrop. Keyed by the overlay element itself (not a closure variable)
// because the handlers below are recreated on every render, and a re-render
// can happen between mousedown and the resulting click.
const pressStartedOnOverlay = new WeakSet<EventTarget>();

/**
 * Click-outside-to-dismiss for the app's `.modal-overlay` pattern: clicking
 * the dimmed backdrop closes the modal exactly as pressing Cancel would.
 * Spread the result onto the overlay element.
 *
 * Only a press that both *starts and ends* on the backdrop counts. The
 * browser dispatches `click` on the nearest common ancestor of the
 * mousedown and mouseup targets, so e.g. selecting text inside an input and
 * releasing the mouse over the backdrop fires `click` on the overlay itself
 * — checking `target === currentTarget` on the click alone isn't enough,
 * the mousedown has to be checked too.
 */
export function closeOnOverlayClick(onClose: () => void) {
  return {
    onMouseDown: (e: MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        pressStartedOnOverlay.add(e.currentTarget);
      } else {
        pressStartedOnOverlay.delete(e.currentTarget);
      }
    },
    onClick: (e: MouseEvent<HTMLDivElement>) => {
      const startedOnOverlay = pressStartedOnOverlay.has(e.currentTarget);
      pressStartedOnOverlay.delete(e.currentTarget);
      if (startedOnOverlay && e.target === e.currentTarget) {
        onClose();
      }
    },
  };
}
