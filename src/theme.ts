// Theme preference (SPECS.md §3 "application preferences", set from
// Settings). Deliberately a plain localStorage-backed module rather than a
// repository client: it has to be read and applied synchronously before the
// first paint (see main.tsx) to avoid a flash of the wrong theme, which an
// async repository call couldn't do.

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'budgetapp.theme';

export function getStoredTheme(): ThemeMode {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

/** Applies a theme to the document without persisting it. */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/** Persists the theme choice and applies it immediately. */
export function setTheme(theme: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

/** Applies whatever theme was previously stored. Call once at startup. */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
