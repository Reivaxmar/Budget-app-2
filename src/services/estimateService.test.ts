import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEstimate,
  deleteEstimate,
  duplicateEstimate,
  generateEstimateNumber,
  getEstimateWithDetails,
  updateEstimateHeader,
} from './estimateService';
import {
  estimateRepositoryClient,
  chapterRepositoryClient,
  lineItemRepositoryClient,
} from '../db/estimateRepositoryClient';

const baseEstimateInput = {
  year: 2026,
  customerId: 'customer-1',
  subject: 'Reforma integral',
  site: 'Carrer de Mallorca 245',
  creationDate: '2026-08-15',
  status: 'draft',
  taxRate: 21,
};

describe('estimateService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('generateEstimateNumber', () => {
    it('starts at 001 for the first estimate of a year', async () => {
      expect(await generateEstimateNumber(2026)).toBe('001-26');
    });

    it('increments sequentially within the same year', async () => {
      await createEstimate(baseEstimateInput);
      await createEstimate(baseEstimateInput);

      expect(await generateEstimateNumber(2026)).toBe('003-26');
    });

    it('keeps numbering independent per year', async () => {
      await createEstimate(baseEstimateInput);
      await createEstimate({ ...baseEstimateInput, year: 2027 });

      expect(await generateEstimateNumber(2026)).toBe('002-26');
      expect(await generateEstimateNumber(2027)).toBe('002-27');
    });

    it('never reuses a number even after the highest-numbered estimate is deleted', async () => {
      const first = await createEstimate(baseEstimateInput);
      await createEstimate(baseEstimateInput);
      await deleteEstimate(first.id);

      // Only "002-26" remains, but the next number must still be 003, not
      // fill the gap left by the deleted "001-26" (SPECS.md §5: never
      // reuse/duplicate a number once assigned).
      expect(await generateEstimateNumber(2026)).toBe('003-26');
    });
  });

  describe('createEstimate', () => {
    it('assigns a generated estimate number and a stable id', async () => {
      const created = await createEstimate(baseEstimateInput);

      expect(created.id).toBeTruthy();
      expect(created.estimateNumber).toBe('001-26');
      expect(created.subject).toBe('Reforma integral');
    });

    it('refuses to create an estimate whose generated number already exists (SPECS.md §15)', async () => {
      // Simulate corrupted/manually-edited data where a record's `year`
      // field disagrees with its `estimateNumber` — generateEstimateNumber
      // filters by `year`, so it won't see this record and will (wrongly)
      // propose "001-26" again. createEstimate must still catch the clash.
      await estimateRepositoryClient.create({
        ...baseEstimateInput,
        year: 2099,
        estimateNumber: '001-26',
      });

      await expect(createEstimate(baseEstimateInput)).rejects.toThrow(/already exists/i);
    });
  });

  describe('getEstimateWithDetails', () => {
    it('returns null for a missing estimate', async () => {
      expect(await getEstimateWithDetails('missing')).toBeNull();
    });

    it('nests chapters and their line items, sorted by order', async () => {
      const estimate = await createEstimate(baseEstimateInput);
      const chapterB = await chapterRepositoryClient.create({
        estimateId: estimate.id,
        title: 'Chapter B',
        order: 1,
      });
      const chapterA = await chapterRepositoryClient.create({
        estimateId: estimate.id,
        title: 'Chapter A',
        order: 0,
      });
      await lineItemRepositoryClient.create({
        chapterId: chapterA.id,
        code: 'A-1',
        description: 'Item A1',
        unit: 'ud',
        quantity: 1,
        unitPrice: 10,
        amount: 10,
        order: 0,
      });

      const details = await getEstimateWithDetails(estimate.id);

      expect(details).not.toBeNull();
      expect(details!.chapters.map((c) => c.id)).toEqual([chapterA.id, chapterB.id]);
      expect(details!.chapters[0].lineItems).toHaveLength(1);
      expect(details!.chapters[1].lineItems).toHaveLength(0);
    });
  });

  describe('updateEstimateHeader', () => {
    it('updates header fields without touching chapters', async () => {
      const estimate = await createEstimate(baseEstimateInput);
      await chapterRepositoryClient.create({
        estimateId: estimate.id,
        title: 'Chapter A',
        order: 0,
      });

      const updated = await updateEstimateHeader(estimate.id, { subject: 'New subject' });

      expect(updated.subject).toBe('New subject');
      expect(updated.estimateNumber).toBe(estimate.estimateNumber);
      const details = await getEstimateWithDetails(estimate.id);
      expect(details!.chapters).toHaveLength(1);
    });
  });

  describe('deleteEstimate', () => {
    it('cascades deletion to chapters and line items', async () => {
      const estimate = await createEstimate(baseEstimateInput);
      const chapter = await chapterRepositoryClient.create({
        estimateId: estimate.id,
        title: 'Chapter A',
        order: 0,
      });
      const lineItem = await lineItemRepositoryClient.create({
        chapterId: chapter.id,
        code: 'A-1',
        description: 'Item A1',
        unit: 'ud',
        quantity: 1,
        unitPrice: 10,
        amount: 10,
        order: 0,
      });

      await deleteEstimate(estimate.id);

      expect(await estimateRepositoryClient.findById(estimate.id)).toBeNull();
      expect(await chapterRepositoryClient.findById(chapter.id)).toBeNull();
      expect(await lineItemRepositoryClient.findById(lineItem.id)).toBeNull();
    });
  });

  describe('duplicateEstimate', () => {
    it('creates an independent copy with a new id, a new number and deep-copied chapters/line items', async () => {
      const original = await createEstimate(baseEstimateInput);
      const chapter = await chapterRepositoryClient.create({
        estimateId: original.id,
        title: 'Chapter A',
        order: 0,
      });
      await lineItemRepositoryClient.create({
        chapterId: chapter.id,
        code: 'A-1',
        description: 'Item A1',
        unit: 'ud',
        quantity: 2,
        unitPrice: 50,
        amount: 100,
        order: 0,
      });

      const duplicate = await duplicateEstimate(original.id);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.estimateNumber).not.toBe(original.estimateNumber);
      expect(duplicate.subject).toBe(original.subject);

      const duplicateDetails = await getEstimateWithDetails(duplicate.id);
      expect(duplicateDetails!.chapters).toHaveLength(1);
      expect(duplicateDetails!.chapters[0].lineItems).toHaveLength(1);
      expect(duplicateDetails!.chapters[0].lineItems[0].amount).toBe(100);

      // Historical-data isolation: mutating the duplicate must never affect
      // the original estimate that was copied from (AGENTS.md, SPECS.md §14).
      await updateEstimateHeader(duplicate.id, { subject: 'Changed on duplicate' });
      const originalDetails = await getEstimateWithDetails(original.id);
      expect(originalDetails!.subject).toBe('Reforma integral');
    });

    it('throws when duplicating an estimate that does not exist', async () => {
      await expect(duplicateEstimate('missing')).rejects.toThrow();
    });
  });
});
