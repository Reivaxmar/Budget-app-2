import { describe, it, expect, beforeEach } from 'vitest';
import {
  acknowledgeLegacyDataBackup,
  buildLegacyDataBackup,
  hasUnacknowledgedLegacyData,
} from './legacyLocalDataService';

describe('legacyLocalDataService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports no legacy data on a fresh install', () => {
    expect(hasUnacknowledgedLegacyData()).toBe(false);
  });

  it('detects leftover data from the old localStorage-backed version', () => {
    localStorage.setItem('budgetapp.customers', JSON.stringify([{ id: '1', name: 'Acme' }]));

    expect(hasUnacknowledgedLegacyData()).toBe(true);
  });

  it('ignores empty arrays/objects as "no data"', () => {
    localStorage.setItem('budgetapp.customers', JSON.stringify([]));
    localStorage.setItem('budgetapp.appSettings', JSON.stringify({}));

    expect(hasUnacknowledgedLegacyData()).toBe(false);
  });

  it('stops reporting legacy data once acknowledged, without deleting it', () => {
    localStorage.setItem('budgetapp.customers', JSON.stringify([{ id: '1', name: 'Acme' }]));

    acknowledgeLegacyDataBackup();

    expect(hasUnacknowledgedLegacyData()).toBe(false);
    expect(localStorage.getItem('budgetapp.customers')).not.toBeNull();
  });

  it('bundles every legacy key present in localStorage into one exportable object', () => {
    localStorage.setItem('budgetapp.customers', JSON.stringify([{ id: '1', name: 'Acme' }]));

    const backup = buildLegacyDataBackup();

    expect(backup['budgetapp.customers']).toEqual([{ id: '1', name: 'Acme' }]);
    expect(backup).not.toHaveProperty('budgetapp.items');
    expect(typeof backup.exportedAt).toBe('string');
  });
});
