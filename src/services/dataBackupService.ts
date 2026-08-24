// Export/import of everything an account owns in Supabase. Export is safe
// and unrestricted (just a read + JSON download). Import is destructive by
// design — it *replaces* the account's current data with the file's
// contents — so it re-authenticates with the account password before
// touching anything (see importAllData) on top of the multi-step UI
// confirmation in SettingsPage.

import { supabase } from '../lib/supabaseClient';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { itemCategoryRepositoryClient } from '../db/itemCategoryRepositoryClient';
import { templateRepositoryClient } from '../db/templateRepositoryClient';
import {
  estimateRepositoryClient,
  chapterRepositoryClient,
  lineItemRepositoryClient,
} from '../db/estimateRepositoryClient';
import { companyProfileRepositoryClient } from '../db/companyProfileRepositoryClient';
import { appSettingsRepositoryClient } from '../db/appSettingsRepositoryClient';
import type { AppSettings } from '../db/appSettingsRepositoryClient';
import type { CompanyProfileSettings } from '../db/companyProfileRepositoryClient';
import type { Chapter, Customer, Estimate, Item, ItemCategory, LineItem, Template } from '../domain/models';

/** The literal phrase the user must type to confirm a destructive import —
 * intentionally not translated, so it's unambiguous regardless of the UI
 * language (same pattern GitHub uses for "type the repo name to delete"). */
export const IMPORT_CONFIRMATION_PHRASE = 'DELETE MY DATA';

export const BACKUP_FORMAT_VERSION = 1;

export interface EstimateBackup extends Estimate {
  chapters: Array<Chapter & { lineItems: LineItem[] }>;
}

export interface AccountBackup {
  formatVersion: number;
  exportedAt: string;
  customers: Customer[];
  itemCategories: ItemCategory[];
  items: Item[];
  templates: Template[];
  estimates: EstimateBackup[];
  companyProfile: CompanyProfileSettings;
  appSettings: AppSettings;
}

/** Reads everything the signed-in account owns into one JSON-serializable bundle. */
export async function exportAllData(): Promise<AccountBackup> {
  const [customers, itemCategories, items, templates, estimates, companyProfile, appSettings] =
    await Promise.all([
      customerRepositoryClient.findMany(),
      itemCategoryRepositoryClient.findMany(),
      itemRepositoryClient.findMany(),
      templateRepositoryClient.findMany(),
      estimateRepositoryClient.findMany(),
      companyProfileRepositoryClient.get(),
      appSettingsRepositoryClient.get(),
    ]);

  const estimatesWithDetails: EstimateBackup[] = await Promise.all(
    estimates.map(async (estimate) => {
      const chapters = await chapterRepositoryClient.findByEstimateId(estimate.id);
      const chaptersWithLineItems = await Promise.all(
        chapters.map(async (chapter) => ({
          ...chapter,
          lineItems: await lineItemRepositoryClient.findByChapterId(chapter.id),
        }))
      );
      return { ...estimate, chapters: chaptersWithLineItems };
    })
  );

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    customers,
    itemCategories,
    items,
    templates,
    estimates: estimatesWithDetails,
    companyProfile,
    appSettings,
  };
}

/** Basic structural check — not a full schema validator, just enough to
 * reject an unrelated/corrupt file before the destructive part of import runs. */
export function isAccountBackup(value: unknown): value is AccountBackup {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.formatVersion === 'number' &&
    Array.isArray(v.customers) &&
    Array.isArray(v.itemCategories) &&
    Array.isArray(v.items) &&
    Array.isArray(v.templates) &&
    Array.isArray(v.estimates)
  );
}

const TABLES_IN_DELETE_ORDER = [
  'line_items',
  'chapters',
  'estimates',
  'customers',
  'items',
  'item_categories',
  'templates',
] as const;

async function wipeAccountData(userId: string): Promise<void> {
  for (const table of TABLES_IN_DELETE_ORDER) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
}

async function insertRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(`Failed to import ${table}: ${error.message}`);
}

/**
 * Replaces all of the signed-in account's data with the contents of a
 * previously exported backup. Original ids are preserved (rather than
 * generating new ones) so cross-entity references — estimate→customer,
 * estimate→template, chapter→estimate, line item→chapter, item→category —
 * stay intact after import.
 *
 * Destructive: everything currently stored for this account is deleted
 * first. Requires re-entering the account password (re-authenticated
 * against Supabase, not just checked client-side) as a last safety check
 * before that happens — the UI layer (SettingsPage) is responsible for the
 * additional "type DELETE MY DATA to confirm" step and warning copy.
 */
export async function importAllData(backup: AccountBackup, password: string): Promise<void> {
  if (!isAccountBackup(backup)) {
    throw new Error('This file is not a valid Presupeitor2000 backup.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error('Not signed in.');
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (reauthError) {
    throw new Error('Incorrect password.');
  }

  const userId = user.id;
  await wipeAccountData(userId);

  await insertRows(
    'item_categories',
    backup.itemCategories.map((category, index) => ({
      id: category.id,
      user_id: userId,
      name: category.name ?? '',
      order: category.order ?? index + 1,
    }))
  );

  await insertRows(
    'customers',
    backup.customers.map((customer) => ({
      id: customer.id,
      user_id: userId,
      name: customer.name ?? '',
      address: customer.address ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      tax_id: customer.taxId ?? '',
      notes: customer.notes ?? '',
    }))
  );

  await insertRows(
    'templates',
    backup.templates.map((template) => {
      const { id, name, isDefault, ...config } = template;
      return { id, user_id: userId, name: name ?? '', is_default: Boolean(isDefault), config };
    })
  );

  await insertRows(
    'items',
    backup.items.map((item) => ({
      id: item.id,
      user_id: userId,
      code: item.code ?? '',
      description: item.description ?? '',
      unit: item.unit ?? '',
      default_price: item.defaultPrice ?? 0,
      category_id: item.categoryId || null,
      keywords: item.keywords ?? '',
    }))
  );

  // Every NOT NULL text/numeric column is defensively coalesced here —
  // not just because of the specific gaps a converted legacy local backup
  // can have (older app versions didn't always populate every field, e.g.
  // `introduction` on estimates could be `null`), but because this is the
  // last point before the data reaches Postgres regardless of where the
  // backup file came from. An explicit `null` in the insert payload is NOT
  // the same as omitting the column — Postgres only applies a column's
  // `default` when the column is left out entirely, so a null here would
  // still violate a NOT NULL constraint even though the column has one.
  await insertRows(
    'estimates',
    backup.estimates.map((estimate) => ({
      id: estimate.id,
      user_id: userId,
      estimate_number: estimate.estimateNumber ?? '',
      year: estimate.year,
      customer_id: estimate.customerId || null,
      subject: estimate.subject ?? '',
      site: estimate.site ?? '',
      creation_date: estimate.creationDate ?? new Date().toISOString(),
      status: estimate.status ?? 'draft',
      tax_rate: estimate.taxRate ?? 0,
      introduction: estimate.introduction ?? '',
      template_id: estimate.templateId || null,
      final_note_title: estimate.finalNoteTitle ?? '',
      final_note_content: estimate.finalNoteContent ?? '',
      template_overrides: estimate.templateOverrides ?? null,
      updated_at: estimate.updatedAt ?? estimate.creationDate ?? new Date().toISOString(),
    }))
  );

  const allChapters = backup.estimates.flatMap((estimate) => estimate.chapters);
  await insertRows(
    'chapters',
    allChapters.map((chapter) => ({
      id: chapter.id,
      user_id: userId,
      estimate_id: chapter.estimateId,
      title: chapter.title ?? '',
      order: chapter.order ?? 0,
    }))
  );

  const allLineItems = allChapters.flatMap((chapter) => chapter.lineItems);
  await insertRows(
    'line_items',
    allLineItems.map((lineItem) => ({
      id: lineItem.id,
      user_id: userId,
      chapter_id: lineItem.chapterId,
      code: lineItem.code ?? '',
      description: lineItem.description ?? '',
      unit: lineItem.unit ?? '',
      quantity: lineItem.quantity ?? 0,
      unit_price: lineItem.unitPrice ?? 0,
      amount: lineItem.amount ?? 0,
      order: lineItem.order ?? 0,
    }))
  );

  await companyProfileRepositoryClient.update({
    profile: {
      id: backup.companyProfile.profile.id ?? 'company-profile',
      name: backup.companyProfile.profile.name ?? '',
      address: backup.companyProfile.profile.address ?? '',
      postalCode: backup.companyProfile.profile.postalCode ?? '',
      phone: backup.companyProfile.profile.phone ?? '',
      email: backup.companyProfile.profile.email ?? '',
      taxId: backup.companyProfile.profile.taxId ?? '',
      slogan: backup.companyProfile.profile.slogan ?? '',
    },
    creationLocation: backup.companyProfile.creationLocation ?? '',
  });
  await appSettingsRepositoryClient.update({
    defaultTaxRate: backup.appSettings.defaultTaxRate ?? 0,
  });
}
