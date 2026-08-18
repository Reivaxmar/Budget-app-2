import { buildEstimateDocumentData } from './documentDataService';
import { generateEstimatePdfBlob } from './pdfService';
import { templateService } from './templateService';
import type { Template } from '../domain/models';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Builds the PDF for a real, persisted estimate (SPECS.md §10 Export PDF)
 * and triggers a browser download. Uses the given template, or the user's
 * default template when none is specified.
 */
export async function exportEstimatePdf(estimateId: string, template?: Template): Promise<void> {
  const data = await buildEstimateDocumentData(estimateId);
  const resolvedTemplate = template ?? (await templateService.getDefaultTemplate());
  const blob = await generateEstimatePdfBlob(data, resolvedTemplate);
  const filename = data.estimate.estimateNumber
    ? `estimate-${data.estimate.estimateNumber}.pdf`
    : `estimate-${estimateId}.pdf`;
  downloadBlob(blob, filename);
}

export const pdfExportService = {
  exportEstimatePdf,
};
