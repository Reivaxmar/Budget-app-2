import { describe, it, expect } from 'vitest';
import { importAllData, isAccountBackup, BACKUP_FORMAT_VERSION } from './dataBackupService';
import type { AccountBackup } from './dataBackupService';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import { estimateRepositoryClient } from '../db/estimateRepositoryClient';
import { convertLegacyBackupToAccountBackup } from './legacyBackupImportService';
import legacyFixture from './__fixtures__/legacyLocalBackup.json';

const validBackup: AccountBackup = {
  formatVersion: BACKUP_FORMAT_VERSION,
  exportedAt: new Date().toISOString(),
  customers: [],
  itemCategories: [],
  items: [],
  templates: [],
  estimates: [],
  companyProfile: {
    profile: {
      id: 'company-profile',
      name: '',
      address: '',
      postalCode: '',
      phone: '',
      email: '',
      taxId: '',
      slogan: '',
    },
    creationLocation: '',
  },
  appSettings: { defaultTaxRate: 0, nextEstimateNumber: 1 },
};

describe('isAccountBackup', () => {
  it('accepts a well-formed backup object', () => {
    expect(isAccountBackup(validBackup)).toBe(true);
  });

  it('rejects null/undefined and non-objects', () => {
    expect(isAccountBackup(null)).toBe(false);
    expect(isAccountBackup(undefined)).toBe(false);
    expect(isAccountBackup('a backup')).toBe(false);
    expect(isAccountBackup(42)).toBe(false);
  });

  it('rejects an object missing the required array fields', () => {
    const { estimates: _estimates, ...withoutEstimates } = validBackup;
    expect(isAccountBackup(withoutEstimates)).toBe(false);
  });

  it('rejects an unrelated JSON file', () => {
    expect(isAccountBackup({ hello: 'world' })).toBe(false);
  });
});

describe('importAllData', () => {
  it('wipes existing customers before re-inserting the backup\'s own — regression for a missing "customers" entry in the delete order, which left old customer rows in place and caused every re-import to fail with a duplicate primary key', async () => {
    const preExisting = await customerRepositoryClient.create({
      name: 'Should be wiped',
      address: '',
      phone: '',
      email: '',
      taxId: '',
      notes: '',
    });

    const backup: AccountBackup = {
      ...validBackup,
      customers: [
        {
          id: 'imported-customer-1',
          name: 'From backup',
          address: '',
          phone: '',
          email: '',
          taxId: '',
          notes: '',
        },
      ],
    };

    await importAllData(backup, 'password123');

    const customers = await customerRepositoryClient.findMany();
    expect(customers.map((c) => c.id)).toEqual(['imported-customer-1']);
    expect(customers.find((c) => c.id === preExisting.id)).toBeUndefined();
  });

  it('re-importing the same backup twice in a row does not fail (would previously hit a duplicate key on customers)', async () => {
    const backup: AccountBackup = {
      ...validBackup,
      customers: [
        { id: 'repeat-customer', name: 'Repeat', address: '', phone: '', email: '', taxId: '', notes: '' },
      ],
    };

    await importAllData(backup, 'password123');
    await expect(importAllData(backup, 'password123')).resolves.not.toThrow();

    const customers = await customerRepositoryClient.findMany();
    expect(customers.map((c) => c.id)).toEqual(['repeat-customer']);
  });

  it('imports a converted legacy backup whose estimates are missing text fields (e.g. "introduction") from an older app version, without violating NOT NULL columns', async () => {
    // Real user data (see legacyBackupImportService.test.ts): several of
    // these estimates simply never had `introduction`/`finalNoteTitle`/
    // `finalNoteContent`/`updatedAt` set by the older app version that
    // created them, so the key is absent (JS reads it back as `undefined`).
    // Bulk-inserting an array of objects with inconsistent keys through
    // PostgREST (what `supabase.from(...).insert([...])` sends) fills any
    // row missing a given key with `null` for that column — it does NOT
    // fall back to the column's Postgres `default` the way a normal
    // single-row insert omitting a column would — so this hits the NOT
    // NULL constraint directly unless importAllData coalesces every field
    // itself before building the insert payload.
    const backup = convertLegacyBackupToAccountBackup(legacyFixture as Record<string, unknown>);
    expect(backup.estimates.some((e) => e.introduction == null)).toBe(true);

    await expect(importAllData(backup, 'password123')).resolves.not.toThrow();

    const imported = await estimateRepositoryClient.findMany();
    expect(imported).toHaveLength(backup.estimates.length);
    for (const estimate of imported) {
      // Checked by type, not just `.not.toBeNull()` — `undefined` is not
      // `null` either, and would just as surely violate the real Postgres
      // NOT NULL constraint (see the comment above on how PostgREST's
      // bulk insert turns a missing key into `null`).
      expect(typeof estimate.introduction).toBe('string');
      expect(typeof estimate.finalNoteTitle).toBe('string');
      expect(typeof estimate.finalNoteContent).toBe('string');
      expect(typeof estimate.updatedAt).toBe('string');
    }
  });
});
