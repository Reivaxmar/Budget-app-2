// Thin services-layer facade over the rendering layer (SPECS.md §11): the
// UI depends on this, not on react-pdf directly, so the rendering engine
// can be swapped later without touching pages/components.

import { renderEstimateDocumentToBlob } from '../rendering/documentRenderingService';
import type { DocumentTemplateConfig } from '../rendering/templateConfig';
import type { EstimateDocumentData } from '../rendering/types';

export async function generateEstimatePdfBlob(
  data: EstimateDocumentData,
  template?: DocumentTemplateConfig
): Promise<Blob> {
  return renderEstimateDocumentToBlob(data, template);
}

export const pdfService = {
  generateEstimatePdfBlob,
};
