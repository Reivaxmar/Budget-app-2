import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../lib/supabaseClient', async () => {
  const { createFakeSupabaseClient } = await import('../test/fakeSupabaseClient');
  return { supabase: createFakeSupabaseClient(), isSupabaseConfigured: true };
});

import { appSettingsRepositoryClient } from './appSettingsRepositoryClient';
import { supabase } from '../lib/supabaseClient';

describe('appSettingsRepositoryClient', () => {
  beforeEach(() => {
    (supabase as unknown as { __reset: () => void }).__reset();
  });

  it('returns built-in defaults when nothing has been saved yet', async () => {
    const settings = await appSettingsRepositoryClient.get();

    expect(settings.defaultTaxRate).toBe(0);
    expect(settings.nextEstimateNumber).toBe(1);
  });

  it('persists updates and returns them on subsequent reads', async () => {
    await appSettingsRepositoryClient.update({ defaultTaxRate: 21, nextEstimateNumber: 1 });

    const settings = await appSettingsRepositoryClient.get();
    expect(settings.defaultTaxRate).toBe(21);
  });

  it('overwrites the previous value on a second update rather than duplicating rows', async () => {
    await appSettingsRepositoryClient.update({ defaultTaxRate: 10, nextEstimateNumber: 1 });
    await appSettingsRepositoryClient.update({ defaultTaxRate: 21, nextEstimateNumber: 1 });

    const settings = await appSettingsRepositoryClient.get();
    expect(settings.defaultTaxRate).toBe(21);
  });

  it('persists a user-chosen starting estimate number', async () => {
    await appSettingsRepositoryClient.update({ defaultTaxRate: 0, nextEstimateNumber: 250 });

    const settings = await appSettingsRepositoryClient.get();
    expect(settings.nextEstimateNumber).toBe(250);
  });
});
