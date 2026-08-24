import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../lib/supabaseClient', async () => {
  const { createFakeSupabaseClient } = await import('../test/fakeSupabaseClient');
  return { supabase: createFakeSupabaseClient(), isSupabaseConfigured: true };
});

import { companyProfileRepositoryClient } from './companyProfileRepositoryClient';
import { supabase } from '../lib/supabaseClient';

describe('companyProfileRepositoryClient', () => {
  beforeEach(() => {
    (supabase as unknown as { __reset: () => void }).__reset();
  });

  it('returns built-in defaults when nothing has been saved yet', async () => {
    const settings = await companyProfileRepositoryClient.get();

    expect(settings.profile.name).toBe('');
    expect(settings.creationLocation).toBe('');
  });

  it('persists updates and returns them on subsequent reads', async () => {
    await companyProfileRepositoryClient.update({
      profile: {
        id: 'company-profile',
        name: 'Reformas Ortiz S.L.',
        address: 'Avinguda Diagonal 512',
        postalCode: '08006 Barcelona',
        phone: '+34 93 200 44 11',
        email: 'info@reformasortiz.example',
        taxId: 'B12345678',
        slogan: 'Construimos confianza',
      },
      creationLocation: 'Barcelona',
    });

    const settings = await companyProfileRepositoryClient.get();
    expect(settings.profile.name).toBe('Reformas Ortiz S.L.');
    expect(settings.creationLocation).toBe('Barcelona');
  });

  it('backfills missing profile fields from defaults when reading a partial/legacy record', async () => {
    await (supabase as any)
      .from('company_profile')
      .upsert({ user_id: 'test-user-id', profile: { name: 'Legacy Co' }, creation_location: '' });

    const settings = await companyProfileRepositoryClient.get();
    expect(settings.profile.name).toBe('Legacy Co');
    expect(settings.profile.email).toBe('');
    expect(settings.profile.taxId).toBe('');
  });
});
