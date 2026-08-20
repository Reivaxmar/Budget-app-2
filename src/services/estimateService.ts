import {
  estimateRepositoryClient as estimateRepository,
  chapterRepositoryClient as chapterRepository,
  lineItemRepositoryClient as lineItemRepository,
} from '../db/estimateRepositoryClient';
import { Estimate } from '../domain/models';
import {
  calculateChapterTotal,
  calculateEstimateTotal,
  ChapterWithLineItems,
  EstimateWithDetails,
} from '../domain/calculations';

export type { ChapterWithLineItems, EstimateWithDetails };
export { calculateChapterTotal, calculateEstimateTotal };

/**
 * Generates an estimate number in the format "###-YY" (e.g., "001-24")
 * based on the year and the count of existing estimates in that year.
 * @param year - The year for the estimate
 * @returns The generated estimate number
 */
export async function generateEstimateNumber(year: number): Promise<string> {
  // Get all estimates for the given year to find the maximum sequence number
  const estimates = await estimateRepository.findMany();
  const yearEstimates = estimates.filter(est => est.year === year);

  // Extract the sequence number (part before the '-') from existing estimate numbers
  const sequenceNumbers = yearEstimates
    .map(est => {
      const match = est.estimateNumber.match(/^(\d+)-/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));

  // Find the next sequence number
  const nextSequence = sequenceNumbers.length > 0
    ? Math.max(...sequenceNumbers) + 1
    : 1;

  // Format as 3 digits with leading zeros
  const sequenceStr = nextSequence.toString().padStart(3, '0');
  const yearStr = (year % 100).toString().padStart(2, '0'); // Last two digits of year

  return `${sequenceStr}-${yearStr}`;
}

/**
 * Creates a new estimate with generated estimate number.
 * @param data - Estimate data without id and estimateNumber
 * @returns The created estimate (with id and estimateNumber)
 */
export async function createEstimate(
  data: Omit<Estimate, 'id' | 'estimateNumber'>
): Promise<Estimate> {
  const estimateNumber = await generateEstimateNumber(data.year);

  // Defensive check against SPECS.md §15 ("prevent accidental duplicate
  // numbers") — generateEstimateNumber is normally collision-free, but this
  // guards against races (e.g. two tabs) or manually-seeded data.
  const existing = await estimateRepository.findMany();
  if (existing.some((e) => e.estimateNumber === estimateNumber)) {
    throw new Error(`Estimate number ${estimateNumber} already exists`);
  }

  const estimate = await estimateRepository.create({
    ...data,
    estimateNumber,
  });
  return estimate;
}

/**
 * Retrieves an estimate by ID with its chapters and line items.
 * @param id - The estimate ID
 * @returns The estimate with chapters and line items, or null if not found
 */
export async function getEstimateWithDetails(id: string): Promise<EstimateWithDetails | null> {
  const estimate = await estimateRepository.findById(id);
  if (!estimate) return null;

  // Get chapters for this estimate
  const chapters = await chapterRepository.findByEstimateId(id);

  // For each chapter, get its line items
  const chaptersWithLineItems = await Promise.all(
    chapters.map(async (chapter) => {
      const lineItems = await lineItemRepository.findByChapterId(chapter.id);
      return { ...chapter, lineItems };
    })
  );

  return { ...estimate, chapters: chaptersWithLineItems };
}

/**
 * Updates an estimate header (does not affect chapters or line items).
 * @param id - The estimate ID
 * @param data - Partial estimate data to update
 * @returns The updated estimate
 */
export async function updateEstimateHeader(
  id: string,
  data: Partial<Omit<Estimate, 'id'>>
): Promise<Estimate> {
  return await estimateRepository.update(id, data);
}

/**
 * Deletes an estimate and all its chapters and line items.
 * @param id - The estimate ID
 */
export async function deleteEstimate(id: string): Promise<void> {
  // Get chapters for this estimate
  const chapters = await chapterRepository.findByEstimateId(id);

  // Delete line items for each chapter
  for (const chapter of chapters) {
    const lineItems = await lineItemRepository.findByChapterId(chapter.id);
    for (const lineItem of lineItems) {
      await lineItemRepository.delete(lineItem.id);
    }
    // Delete the chapter
    await chapterRepository.delete(chapter.id);
  }

  // Delete the estimate
  await estimateRepository.delete(id);
}

/**
 * Duplicates an estimate (creates a copy with new ID and estimate number).
 * @param id - The estimate ID to duplicate
 * @returns The duplicated estimate (without chapters and line items)
 */
export async function duplicateEstimate(id: string): Promise<Estimate> {
  // Get the original estimate with details
  const original = await getEstimateWithDetails(id);
  if (!original) {
    throw new Error(`Estimate with id ${id} not found`);
  }

  // Generate a new estimate number for the same year
  const estimateNumber = await generateEstimateNumber(original.year);

  // Create the new estimate header
  const newEstimate = await estimateRepository.create({
    estimateNumber,
    year: original.year,
    customerId: original.customerId,
    subject: original.subject,
    site: original.site,
    creationDate: original.creationDate,
    status: original.status,
    taxRate: original.taxRate,
    introduction: original.introduction,
    templateId: original.templateId,
    finalNoteTitle: original.finalNoteTitle,
    finalNoteContent: original.finalNoteContent,
    templateOverrides: original.templateOverrides,
  });

  // Duplicate chapters and line items
  for (const originalChapter of original.chapters) {
    const newChapter = await chapterRepository.create({
      estimateId: newEstimate.id,
      title: originalChapter.title,
      order: originalChapter.order,
    });

    for (const originalLineItem of originalChapter.lineItems) {
      await lineItemRepository.create({
        chapterId: newChapter.id,
        code: originalLineItem.code,
        description: originalLineItem.description,
        unit: originalLineItem.unit,
        quantity: originalLineItem.quantity,
        unitPrice: originalLineItem.unitPrice,
        amount: originalLineItem.amount,
        order: originalLineItem.order,
      });
    }
  }

  return newEstimate;
}

// Service object for convenient access
export const estimateService = {
  createEstimate,
  getEstimateWithDetails,
  updateEstimateHeader,
  deleteEstimate,
  duplicateEstimate,
  calculateEstimateTotal,
  calculateChapterTotal,
  generateEstimateNumber,
};