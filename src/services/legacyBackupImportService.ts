// Converts a *local* backup (the raw localStorage bundle produced by
// LocalBackupNotice/legacyLocalDataService — one JSON key per old
// `budgetapp.*` localStorage entry) into the AccountBackup shape
// dataBackupService.importAllData expects. These are two different file
// formats: the local backup is a point-in-time dump of the pre-Supabase
// version's storage, not a Supabase account export — without this
// conversion, importAllData's `isAccountBackup` check correctly rejects it
// as structurally invalid, but that left users who followed the "back up
// your local data first" prompt with no way to actually bring that data
// into their new account.

import type {
  Chapter,
  Customer,
  Item,
  ItemCategory,
  LineItem,
  Template,
  TemplateConfig,
  UserProfile,
} from '../domain/models';
import type { AppSettings } from '../db/appSettingsRepositoryClient';
import type { CompanyProfileSettings } from '../db/companyProfileRepositoryClient';
import { defaultDocumentTemplate } from '../rendering/templateConfig';
import { BACKUP_FORMAT_VERSION } from './dataBackupService';
import type { AccountBackup, EstimateBackup } from './dataBackupService';

/** True for a file that looks like the raw local-storage bundle
 * (`legacyLocalDataService.buildLegacyDataBackup()`'s output) rather than an
 * account export — it has `budgetapp.*`-prefixed top-level keys instead of
 * `customers`/`estimates`/etc. */
export function isLegacyLocalBackup(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value as Record<string, unknown>).some((key) => key.startsWith('budgetapp.'));
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Backfills any TemplateConfig fields missing from an older app version's
 * saved template (e.g. `table.showChapterSubtotal` didn't always exist),
 * section by section — each section is complete on its own in every version
 * this app has shipped, so a per-section merge (rather than a full deep
 * merge) is enough. */
function normalizeTemplateConfig(raw: Partial<TemplateConfig> | null | undefined): TemplateConfig {
  const base = defaultDocumentTemplate;
  return {
    page: { ...base.page, ...raw?.page },
    typography: { ...base.typography, ...raw?.typography },
    colors: { ...base.colors, ...raw?.colors },
    cover: { ...base.cover, ...raw?.cover },
    header: { ...base.header, ...raw?.header },
    footer: { ...base.footer, ...raw?.footer },
    table: { ...base.table, ...raw?.table },
    finalPage: { ...base.finalPage, ...raw?.finalPage },
  };
}

function normalizeTemplate(raw: Record<string, unknown>): Template {
  const { id, name, isDefault, ...config } = raw as unknown as Template;
  return {
    id,
    name: name ?? '',
    isDefault: Boolean(isDefault),
    ...normalizeTemplateConfig(config),
  };
}

/** Older app versions predate the item-category feature and stored a plain
 * `category` name string (often empty) instead of `categoryId`. */
function normalizeItem(raw: Record<string, unknown>, categories: ItemCategory[]): Item {
  const legacyCategoryName = typeof raw.category === 'string' ? raw.category : undefined;
  const categoryId =
    (raw.categoryId as string | undefined) ||
    categories.find((c) => c.name === legacyCategoryName)?.id ||
    categories[0]?.id ||
    '';

  return {
    id: raw.id as string,
    code: (raw.code as string) ?? '',
    description: (raw.description as string) ?? '',
    unit: (raw.unit as string) ?? '',
    defaultPrice: (raw.defaultPrice as number) ?? 0,
    categoryId,
    keywords: (raw.keywords as string) ?? '',
  };
}

function normalizeCompanyProfile(raw: unknown): CompanyProfileSettings {
  const value = (raw ?? {}) as Partial<CompanyProfileSettings>;
  const profile = (value.profile ?? {}) as Partial<UserProfile>;
  return {
    profile: {
      id: profile.id ?? 'company-profile',
      name: profile.name ?? '',
      address: profile.address ?? '',
      postalCode: profile.postalCode ?? '',
      phone: profile.phone ?? '',
      email: profile.email ?? '',
      taxId: profile.taxId ?? '',
      slogan: profile.slogan ?? '',
    },
    creationLocation: value.creationLocation ?? '',
  };
}

/**
 * Reassembles estimates with their chapters/line items from the three flat
 * `budgetapp.estimates` / `budgetapp.chapters` / `budgetapp.lineItems`
 * arrays (this app has always stored them as separate tables — any
 * `chapters` field found directly on a raw estimate record is a stray
 * leftover from data massaging elsewhere and is ignored in favor of the
 * real per-table relations, so a chapter or line item never ends up
 * duplicated between the two).
 */
function buildEstimatesWithChapters(legacy: Record<string, unknown>): EstimateBackup[] {
  const rawEstimates = asArray<Record<string, unknown>>(legacy['budgetapp.estimates']);
  const chapters = asArray<Chapter>(legacy['budgetapp.chapters']);
  const lineItems = asArray<LineItem>(legacy['budgetapp.lineItems']);

  return rawEstimates.map((rawEstimate) => {
    const { chapters: _embeddedChapters, ...estimate } = rawEstimate;
    const templateOverrides = estimate.templateOverrides
      ? normalizeTemplateConfig(estimate.templateOverrides as Partial<TemplateConfig>)
      : null;

    const estimateChapters = chapters
      .filter((chapter) => chapter.estimateId === estimate.id)
      .map((chapter) => ({
        ...chapter,
        lineItems: lineItems.filter((lineItem) => lineItem.chapterId === chapter.id),
      }));

    return {
      ...(estimate as unknown as EstimateBackup),
      templateOverrides,
      chapters: estimateChapters,
    };
  });
}

export function convertLegacyBackupToAccountBackup(legacy: Record<string, unknown>): AccountBackup {
  const itemCategories = asArray<ItemCategory>(legacy['budgetapp.itemCategories']);
  const appSettings = (legacy['budgetapp.appSettings'] as AppSettings | undefined) ?? {
    defaultTaxRate: 0,
  };

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: (legacy.exportedAt as string) ?? new Date().toISOString(),
    customers: asArray<Customer>(legacy['budgetapp.customers']),
    itemCategories,
    items: asArray<Record<string, unknown>>(legacy['budgetapp.items']).map((item) =>
      normalizeItem(item, itemCategories)
    ),
    templates: asArray<Record<string, unknown>>(legacy['budgetapp.templates']).map(normalizeTemplate),
    estimates: buildEstimatesWithChapters(legacy),
    companyProfile: normalizeCompanyProfile(legacy['budgetapp.companyProfile']),
    appSettings,
  };
}
