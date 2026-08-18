import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify, subscribeToToasts, dismissToast } from './notifications';

describe('notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Toast state lives in module scope, not per-test — flush any toasts
    // still pending auto-dismissal so they don't leak into the next test.
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('notifies subscribers with the new toast when notify() is called', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);
    listener.mockClear(); // ignore the initial (empty) call subscribeToToasts makes

    notify('Saved.', 'success');

    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ message: 'Saved.', type: 'success' }),
    ]);
    unsubscribe();
  });

  it('defaults to type "info" when none is given', () => {
    const listener = vi.fn();
    subscribeToToasts(listener);
    listener.mockClear();

    notify('Just so you know.');

    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'info' }),
    ]);
  });

  it('removes the toast on its own after the given duration, without any user interaction', () => {
    const listener = vi.fn();
    subscribeToToasts(listener);

    const id = notify('Temporary', 'info', 1000);
    expect(listener).toHaveBeenLastCalledWith([expect.objectContaining({ id })]);

    vi.advanceTimersByTime(1000);

    expect(listener).toHaveBeenLastCalledWith([]);
  });

  it('dismissToast removes a toast immediately', () => {
    const listener = vi.fn();
    subscribeToToasts(listener);

    const id = notify('Dismiss me', 'error', 10000);
    dismissToast(id);

    expect(listener).toHaveBeenLastCalledWith([]);
  });

  it('unsubscribe stops further notifications to that listener', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToToasts(listener);
    unsubscribe();
    listener.mockClear();

    notify('After unsubscribe');

    expect(listener).not.toHaveBeenCalled();
  });
});
