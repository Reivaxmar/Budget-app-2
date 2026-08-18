// Node-only side of the document-rendering service. `renderToBuffer` uses
// react-pdf's Node stream renderer, which is unavailable/unnecessary in the
// browser — kept in its own module so browser bundles (see
// documentRenderingService.ts) never pull in Node-only code. Used for
// rendering tests and any future server-side/CLI PDF export.

import { renderToBuffer } from '@react-pdf/renderer';
import { createEstimateDocumentElement } from './EstimateDocument';
import { defaultDocumentTemplate } from './templateConfig';
import type { DocumentTemplateConfig } from './templateConfig';
import type { EstimateDocumentData } from './types';

/**
 * Renders an estimate to a PDF Buffer, given structured estimate data and a
 * (optional) template configuration.
 */
export async function renderEstimateDocumentToBuffer(
  data: EstimateDocumentData,
  template: DocumentTemplateConfig = defaultDocumentTemplate
): Promise<Buffer> {
  return renderToBuffer(createEstimateDocumentElement(data, template));
}
