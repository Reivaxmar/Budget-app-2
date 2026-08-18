import { describe, it, expect, beforeEach } from 'vitest';
import { appSettingsRepositoryClient } from './appSettingsRepositoryClient';

describe('appSettingsRepositoryClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns built-in defaults when nothing has been saved yet', async () => {
    const settings = await appSettingsRepositoryClient.get();

    expect(settings.defaultTaxRate).toBe(0);
  });

  it('persists updates and returns them on subsequent reads', async () => {
    await appSettingsRepositoryClient.update({ defaultTaxRate: 21 });

    const settings = await appSettingsRepositoryClient.get();
    expect(settings.defaultTaxRate).toBe(21);
  });

  it('backfills missing fields from defaults when reading a partial/legacy record', async () => {
    localStorage.setItem('budgetapp.appSettings', JSON.stringify({}));

    const settings = await appSettingsRepositoryClient.get();
    expect(settings.defaultTaxRate).toBe(0);
  });
});
