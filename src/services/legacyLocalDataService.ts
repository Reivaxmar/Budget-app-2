// Before this app used Supabase, everything lived in the browser's/webview's
// localStorage (see git history of src/db/*RepositoryClient.ts). That data
// is never migrated automatically — it's local to one machine and isn't
// tied to any account — so an install that already has some is offered a
// one-time export before it's effectively abandoned in favor of the
// signed-in account's cloud data (see components/LocalBackupNotice.tsx).

const LEGACY_KEYS = [
  'budgetapp.companyProfile',
  'budgetapp.appSettings',
  'budgetapp.customers',
  'budgetapp.items',
  'budgetapp.itemCategories',
  'budgetapp.templates',
  'budgetapp.estimates',
  'budgetapp.chapters',
  'budgetapp.lineItems',
] as const;

const ACKNOWLEDGED_KEY = 'budgetapp.legacyBackupAcknowledged';

function isNonEmpty(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (parsed && typeof parsed === 'object') return Object.keys(parsed).length > 0;
    return false;
  } catch {
    return false;
  }
}

/** True when this machine has leftover pre-Supabase local data that hasn't
 * been backed up yet. */
export function hasUnacknowledgedLegacyData(): boolean {
  if (localStorage.getItem(ACKNOWLEDGED_KEY) === 'true') return false;
  return LEGACY_KEYS.some((key) => isNonEmpty(localStorage.getItem(key)));
}

/** Bundles the raw legacy localStorage contents into one downloadable JSON object. */
export function buildLegacyDataBackup(): Record<string, unknown> {
  const bundle: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        bundle[key] = JSON.parse(raw);
      } catch {
        bundle[key] = raw;
      }
    }
  }
  return bundle;
}

export function acknowledgeLegacyDataBackup(): void {
  localStorage.setItem(ACKNOWLEDGED_KEY, 'true');
}
