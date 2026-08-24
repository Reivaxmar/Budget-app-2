import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../lib/supabaseClient', async () => {
  const { createFakeSupabaseClient } = await import('../test/fakeSupabaseClient');
  return { supabase: createFakeSupabaseClient(), isSupabaseConfigured: true };
});

import { templateRepositoryClient } from './templateRepositoryClient';
import { supabase } from '../lib/supabaseClient';
import type { Template } from '../domain/models';

const sampleTemplate: Omit<Template, 'id'> = {
  name: 'Standard',
  isDefault: true,
  page: { size: 'A4', marginPt: 48 },
  typography: { fontFamily: 'Helvetica', baseFontSize: 9, titleFontSize: 22, headingFontSize: 12 },
  colors: { text: '#1a1a1a', muted: '#666666', tableHeaderBackground: '#eeeeee', borderColor: '#cccccc' },
  cover: { showCreationLocationDate: true, showSlogan: true },
  header: { showEstimateNumberAndDate: true },
  footer: { showPageNumbers: true, showCompanyInfo: true },
  table: {
    showBorders: true,
    showChapterSubtotal: true,
    columns: [{ key: 'description', label: 'Description', width: '100%' }],
  },
  finalPage: {
    totalLabel: 'Total',
    signatureLabel: 'Conforme cliente',
    noteTitle: 'Condiciones',
    noteContent: '',
  },
};

describe('templateRepositoryClient', () => {
  beforeEach(() => {
    (supabase as unknown as { __reset: () => void }).__reset();
  });

  it('creates a template and assigns an id', async () => {
    const created = await templateRepositoryClient.create(sampleTemplate);

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Standard');
    expect(created.table.columns).toHaveLength(1);
  });

  it('persists templates across findMany calls', async () => {
    await templateRepositoryClient.create(sampleTemplate);
    await templateRepositoryClient.create({ ...sampleTemplate, name: 'Compact', isDefault: false });

    const templates = await templateRepositoryClient.findMany();
    expect(templates).toHaveLength(2);
    expect(templates.map((t) => t.name).sort()).toEqual(['Compact', 'Standard']);
  });

  it('finds a template by id, returning null when not found', async () => {
    const created = await templateRepositoryClient.create(sampleTemplate);

    expect(await templateRepositoryClient.findById(created.id)).toEqual(created);
    expect(await templateRepositoryClient.findById('missing')).toBeNull();
  });

  it('updates a template in place without changing its id', async () => {
    const created = await templateRepositoryClient.create(sampleTemplate);

    const updated = await templateRepositoryClient.update(created.id, {
      name: 'Renamed',
      typography: { ...sampleTemplate.typography, baseFontSize: 11 },
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Renamed');
    expect(updated.typography.baseFontSize).toBe(11);
    expect(updated.isDefault).toBe(true);
  });

  it('throws when updating a template that does not exist', async () => {
    await expect(
      templateRepositoryClient.update('missing', { name: 'x' })
    ).rejects.toThrow();
  });

  it('deletes a template', async () => {
    const created = await templateRepositoryClient.create(sampleTemplate);

    await templateRepositoryClient.delete(created.id);

    expect(await templateRepositoryClient.findById(created.id)).toBeNull();
    expect(await templateRepositoryClient.findMany()).toHaveLength(0);
  });
});
