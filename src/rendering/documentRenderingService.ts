// Document-rendering service (SPECS.md §6, §11, §21). This is the single
// entry point that turns structured estimate data plus a template
// configuration into a PDF. It has no dependency on the database or the
// estimate editor — callers (UI services, tests, future export/print code)
// hand it plain data and get a PDF back.
//
// This file is safe to bundle for the browser (preview/export/print). For
// Node-only Buffer generation (server-side export, tests), see
// documentRenderingService.node.ts.

import { pdf } from '@react-pdf/renderer';
import { createEstimateDocumentElement } from './EstimateDocument';
import { defaultDocumentTemplate } from './templateConfig';
import type { DocumentTemplateConfig } from './templateConfig';
import type { EstimateDocumentData } from './types';

/**
 * Renders an estimate to a PDF Blob, given structured estimate data and a
 * (optional) template configuration. Used for in-app preview, export and
 * print — the same data and template always produce the same layout
 * (SPECS.md §10).
 */
export async function renderEstimateDocumentToBlob(
  data: EstimateDocumentData,
  template: DocumentTemplateConfig = defaultDocumentTemplate
): Promise<Blob> {
  const instance = pdf(createEstimateDocumentElement(data, template));
  return instance.toBlob();
}

export const documentRenderingService = {
  renderEstimateDocumentToBlob,
};
