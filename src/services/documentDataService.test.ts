import { describe, it, expect, beforeEach } from 'vitest';
import { buildEstimateDocumentData } from './documentDataService';
import { estimateService } from './estimateService';
import {
  chapterRepositoryClient,
  lineItemRepositoryClient,
} from '../db/estimateRepositoryClient';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import { companyProfileRepositoryClient } from '../db/companyProfileRepositoryClient';

describe('buildEstimateDocumentData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('assembles estimate, customer, chapters/line items and company defaults into render-ready data', async () => {
    const customer = await customerRepositoryClient.create({
      name: 'Marta Puig Soler',
      address: 'Carrer de Mallorca 245',
      phone: '+34 93 555 12 34',
      email: 'marta.puig@example.com',
      taxId: '38456789K',
      notes: '',
    });

    const estimate = await estimateService.createEstimate({
      year: 2026,
      customerId: customer.id,
      subject: 'Reforma integral',
      site: 'Carrer de Mallorca 245',
      creationDate: '2026-08-15',
      status: 'draft',
      taxRate: 21,
    });

    const chapter = await chapterRepositoryClient.create({
      estimateId: estimate.id,
      title: 'Demoliciones',
      order: 0,
    });

    await lineItemRepositoryClient.create({
      chapterId: chapter.id,
      code: 'DEM-001',
      description: 'Demolición de tabiquería',
      unit: 'm²',
      quantity: 10,
      unitPrice: 20,
      amount: 200,
      order: 0,
    });

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

    const data = await buildEstimateDocumentData(estimate.id);

    expect(data.estimate.id).toBe(estimate.id);
    expect(data.customer.id).toBe(customer.id);
    expect(data.chapters).toHaveLength(1);
    expect(data.chapters[0].lineItems).toHaveLength(1);
    expect(data.company.name).toBe('Reformas Ortiz S.L.');
    expect(data.creationLocation).toBe('Barcelona');
    expect(data.standardNote.content).toBe('Presupuesto válido 30 días.');
  });

  it('throws when the estimate does not exist', async () => {
    await expect(buildEstimateDocumentData('missing-estimate')).rejects.toThrow(
      /not found/i
    );
  });

  it('throws when the estimate references a customer that no longer exists', async () => {
    const estimate = await estimateService.createEstimate({
      year: 2026,
      customerId: 'missing-customer',
      subject: 'Subject',
      site: 'Site',
      creationDate: '2026-08-15',
      status: 'draft',
      taxRate: 21,
    });

    await expect(buildEstimateDocumentData(estimate.id)).rejects.toThrow(/customer/i);
  });
});
