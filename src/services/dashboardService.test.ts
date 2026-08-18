import { describe, it, expect, beforeEach } from 'vitest';
import { getDashboardOverview } from './dashboardService';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import {
  estimateRepositoryClient,
  chapterRepositoryClient,
  lineItemRepositoryClient,
} from '../db/estimateRepositoryClient';

describe('getDashboardOverview', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns zeroed-out stats and no recent estimates when nothing exists yet', async () => {
    const overview = await getDashboardOverview();

    expect(overview.customerCount).toBe(0);
    expect(overview.estimateCount).toBe(0);
    expect(overview.estimatesByStatus).toEqual({});
    expect(overview.totalValue).toBe(0);
    expect(overview.recentEstimates).toEqual([]);
  });

  it('aggregates customer/estimate counts, status breakdown, total value and recent estimates', async () => {
    const customer = await customerRepositoryClient.create({
      name: 'Marta Puig',
      address: 'Carrer de Mallorca 245',
      phone: '',
      email: 'marta@example.com',
      taxId: '',
      notes: '',
    });

    const draftEstimate = await estimateRepositoryClient.create({
      estimateNumber: '001-26',
      year: 2026,
      customerId: customer.id,
      subject: 'Reforma cocina',
      site: '',
      creationDate: '2026-01-10',
      status: 'draft',
      taxRate: 21,
    });
    const issuedEstimate = await estimateRepositoryClient.create({
      estimateNumber: '002-26',
      year: 2026,
      customerId: customer.id,
      subject: 'Reforma baño',
      site: '',
      creationDate: '2026-02-15',
      status: 'issued',
      taxRate: 21,
    });

    const chapter1 = await chapterRepositoryClient.create({
      estimateId: draftEstimate.id,
      title: 'Demoliciones',
      order: 0,
    });
    const chapter2 = await chapterRepositoryClient.create({
      estimateId: issuedEstimate.id,
      title: 'Fontanería',
      order: 0,
    });

    await lineItemRepositoryClient.create({
      chapterId: chapter1.id,
      code: '',
      description: 'Demolición',
      unit: 'm²',
      quantity: 10,
      unitPrice: 20,
      amount: 200,
      order: 0,
    });
    await lineItemRepositoryClient.create({
      chapterId: chapter2.id,
      code: '',
      description: 'Tubería',
      unit: 'm',
      quantity: 5,
      unitPrice: 30,
      amount: 150,
      order: 0,
    });

    const overview = await getDashboardOverview();

    expect(overview.customerCount).toBe(1);
    expect(overview.estimateCount).toBe(2);
    expect(overview.estimatesByStatus).toEqual({ draft: 1, issued: 1 });
    expect(overview.totalValue).toBe(350);

    // Most recently created first.
    expect(overview.recentEstimates).toHaveLength(2);
    expect(overview.recentEstimates[0].id).toBe(issuedEstimate.id);
    expect(overview.recentEstimates[0].customerName).toBe('Marta Puig');
    expect(overview.recentEstimates[0].total).toBe(150);
    expect(overview.recentEstimates[1].id).toBe(draftEstimate.id);
    expect(overview.recentEstimates[1].total).toBe(200);
  });

  it('only returns up to the given limit of recent estimates', async () => {
    const customer = await customerRepositoryClient.create({
      name: 'Customer',
      address: '',
      phone: '',
      email: '',
      taxId: '',
      notes: '',
    });

    for (let i = 0; i < 7; i++) {
      await estimateRepositoryClient.create({
        estimateNumber: `00${i}-26`,
        year: 2026,
        customerId: customer.id,
        subject: `Estimate ${i}`,
        site: '',
        creationDate: `2026-01-${10 + i}`,
        status: 'draft',
        taxRate: 0,
      });
    }

    const overview = await getDashboardOverview(3);

    expect(overview.estimateCount).toBe(7);
    expect(overview.recentEstimates).toHaveLength(3);
  });
});
