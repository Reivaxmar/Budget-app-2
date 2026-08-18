import { estimateService } from './estimateService';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import { companyProfileRepositoryClient } from '../db/companyProfileRepositoryClient';
import type { EstimateDocumentData } from '../rendering/types';

/**
 * Assembles the structured data the rendering layer needs (SPECS.md §6) for
 * a real, persisted estimate: the estimate with its chapters/line items, its
 * customer, and the company profile/document defaults. This is the bridge
 * between persistence and rendering — the rendering layer itself never
 * touches the database directly.
 */
export async function buildEstimateDocumentData(estimateId: string): Promise<EstimateDocumentData> {
  const estimate = await estimateService.getEstimateWithDetails(estimateId);
  if (!estimate) {
    throw new Error(`Estimate ${estimateId} not found`);
  }

  const customer = await customerRepositoryClient.findById(estimate.customerId);
  if (!customer) {
    throw new Error(`Customer ${estimate.customerId} for estimate ${estimateId} not found`);
  }

  const { profile, creationLocation } = await companyProfileRepositoryClient.get();

  // The final-page note is owned by the Template and snapshotted onto the
  // estimate itself (Estimate.finalNoteTitle/finalNoteContent) when it's
  // created, so a later edit to the template never changes an
  // already-issued estimate's rendered output.
  return {
    estimate,
    customer,
    chapters: estimate.chapters,
    company: profile,
    standardNote: {
      id: `${estimate.id}-final-note`,
      key: 'estimate-final-note',
      title: estimate.finalNoteTitle,
      content: estimate.finalNoteContent,
    },
    creationLocation,
  };
}

export const documentDataService = {
  buildEstimateDocumentData,
};
