import { describe, it, expect } from 'vitest';
import { convertLegacyBackupToAccountBackup, isLegacyLocalBackup } from './legacyBackupImportService';
import { isAccountBackup } from './dataBackupService';
import legacyFixture from './__fixtures__/legacyLocalBackup.json';

describe('isLegacyLocalBackup', () => {
  it('recognizes a raw localStorage export bundle', () => {
    expect(isLegacyLocalBackup(legacyFixture)).toBe(true);
  });

  it('rejects an account export (no budgetapp.* keys)', () => {
    expect(
      isLegacyLocalBackup({ formatVersion: 1, customers: [], itemCategories: [], items: [], templates: [], estimates: [] })
    ).toBe(false);
  });

  it('rejects unrelated objects', () => {
    expect(isLegacyLocalBackup({ hello: 'world' })).toBe(false);
    expect(isLegacyLocalBackup(null)).toBe(false);
  });
});

describe('convertLegacyBackupToAccountBackup', () => {
  // This is exactly the shape a real user's pre-Supabase local backup
  // takes (LocalBackupNotice's export) — including quirks from older app
  // versions: items with a plain `category` name instead of `categoryId`,
  // templates missing `table.showChapterSubtotal`, and estimates that carry
  // a stray embedded `chapters` field alongside the real flat
  // `budgetapp.chapters` / `budgetapp.lineItems` tables.
  const converted = convertLegacyBackupToAccountBackup(legacyFixture as Record<string, unknown>);

  it('produces a structurally valid account backup', () => {
    expect(isAccountBackup(converted)).toBe(true);
  });

  it('carries over customers as-is', () => {
    expect(converted.customers).toHaveLength(3);
    expect(converted.customers[0].name).toContain('Juan');
  });

  it('backfills a categoryId for items that only had a legacy category name', () => {
    expect(converted.items).toHaveLength(5);
    for (const item of converted.items) {
      expect(item.categoryId).toBeTruthy();
    }
  });

  it('reassembles each estimate\'s chapters/line items from the flat tables, not the stray embedded field', () => {
    expect(converted.estimates.length).toBeGreaterThan(0);
    const withChapters = converted.estimates.find((e) => e.chapters.length > 0);
    expect(withChapters).toBeDefined();
    const chapter = withChapters!.chapters[0];
    expect(chapter.lineItems.every((li) => li.chapterId === chapter.id)).toBe(true);
  });

  it('backfills missing TemplateConfig fields (e.g. showChapterSubtotal) on old templates', () => {
    for (const template of converted.templates) {
      expect(typeof template.table.showChapterSubtotal).toBe('boolean');
    }
  });

  it('normalizes the company profile, backfilling fields like taxId that did not exist yet', () => {
    expect(converted.companyProfile.profile.name).toBe('Paco Jones SL');
    expect(converted.companyProfile.profile.taxId).toBe('');
  });

  it('carries over app settings', () => {
    expect(converted.appSettings.defaultTaxRate).toBe(6);
  });
});
