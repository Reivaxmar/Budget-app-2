import { describe, it, expect, beforeEach } from 'vitest';
import { companyProfileRepositoryClient } from './companyProfileRepositoryClient';

describe('companyProfileRepositoryClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns built-in defaults when nothing has been saved yet', async () => {
    const settings = await companyProfileRepositoryClient.get();

    expect(settings.profile.name).toBe('');
    expect(settings.creationLocation).toBe('');
    expect(settings.standardNote.key).toBe('estimate-final-note');
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
        slogan: 'Construimos confianza',
      },
      creationLocation: 'Barcelona',
      standardNote: {
        id: 'standard-note-default',
        key: 'estimate-final-note',
        title: 'Condiciones',
        content: 'Presupuesto válido 30 días.',
      },
    });

    const settings = await companyProfileRepositoryClient.get();
    expect(settings.profile.name).toBe('Reformas Ortiz S.L.');
    expect(settings.creationLocation).toBe('Barcelona');
    expect(settings.standardNote.content).toBe('Presupuesto válido 30 días.');
  });

  it('backfills missing fields from defaults when reading a partial/legacy record', async () => {
    localStorage.setItem(
      'budgetapp.companyProfile',
      JSON.stringify({ profile: { name: 'Legacy Co' } })
    );

    const settings = await companyProfileRepositoryClient.get();
    expect(settings.profile.name).toBe('Legacy Co');
    expect(settings.profile.email).toBe('');
    expect(settings.standardNote.key).toBe('estimate-final-note');
  });
});
