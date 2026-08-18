import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyTheme, getStoredTheme, initTheme, setTheme } from './theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to "system" when nothing has been stored', () => {
    expect(getStoredTheme()).toBe('system');
  });

  it('applyTheme sets a data-theme attribute for light/dark and removes it for system', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('setTheme persists the choice and applies it immediately', () => {
    setTheme('dark');

    expect(getStoredTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('initTheme applies whatever was previously persisted', () => {
    setTheme('light');
    document.documentElement.removeAttribute('data-theme'); // simulate a fresh page load

    initTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('ignores a corrupted stored value and falls back to system', () => {
    localStorage.setItem('budgetapp.theme', 'not-a-real-theme');

    expect(getStoredTheme()).toBe('system');
  });
});
