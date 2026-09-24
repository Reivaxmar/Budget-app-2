import type { Estimate, Template } from '../domain/models';
import { resolveSaveDestination } from '../utils/saveFile';

/**
 * Swaps in an estimate's own full presentation config (SPECS §9/§21: the
 * template governs presentation, but a specific estimate can customize its
 * own copy of it) in place of the resolved template's config. This is a
 * full-object swap, not a field-by-field merge — `templateOverrides` is
 * always a complete, self-contained config once set (see EstimateEditorPage's
 * "Edit template" modal), so editing the shared template later never changes
 * an estimate that already has an override. `null` means "no override": use
 * the resolved template as-is.
 */
function applyTemplateOverrides(template: Template, overrides: Estimate['templateOverrides']): Template {
  if (!overrides) {
    return template;
  }

  return { ...template, ...overrides };
}

export interface ExportEstimatePdfOptions {
  template?: Template;
  /** The estimate's visible number (e.g. "001-26"), if the caller already has it, for a nicer filename. */
  estimateNumber?: string;
}

/**
 * Builds the PDF for a real, persisted estimate (SPECS.md §10 Export PDF),
 * as a Blob — used both for the actual "Export PDF" download and for the
 * in-app "Preview"/"Print" actions, which never write anything to disk.
 * Uses the given template, or the estimate's own/the user's default
 * template when none is specified.
 */
export async function buildEstimatePdfBlob(
  estimateId: string,
  { template }: Pick<ExportEstimatePdfOptions, 'template'> = {}
): Promise<Blob> {
  const [{ buildEstimateDocumentData }, { generateEstimatePdfBlob }, { templateService }] =
    await Promise.all([
      import('./documentDataService'),
      import('./pdfService'),
      import('./templateService'),
    ]);

  const data = await buildEstimateDocumentData(estimateId);
  // The estimate's own chosen template (SPECS §9/§21: the template
  // governs presentation for this estimate) takes precedence; only fall
  // back to the default template for older estimates saved before a
  // template was assigned.
  const estimateTemplate = data.estimate.templateId
    ? await templateService.getTemplate(data.estimate.templateId)
    : null;
  const resolvedTemplate = template ?? estimateTemplate ?? (await templateService.getDefaultTemplate());
  const effectiveTemplate = applyTemplateOverrides(resolvedTemplate, data.estimate.templateOverrides);
  return generateEstimatePdfBlob(data, effectiveTemplate);
}

/**
 * Builds the PDF for a real, persisted estimate and asks the user where to
 * save it. See {@link buildEstimatePdfBlob} for the actual rendering.
 */
export async function exportEstimatePdf(
  estimateId: string,
  { template, estimateNumber }: ExportEstimatePdfOptions = {}
): Promise<void> {
  const filename = `estimate-${estimateNumber || estimateId}.pdf`;

  // Resolved before any of the (potentially slow, cold-import) PDF-building
  // work — see resolveSaveDestination's own doc comment for why.
  const destination = await resolveSaveDestination(filename, [{ name: 'PDF', extensions: ['pdf'] }]);
  if (!destination) {
    return;
  }

  const blob = await buildEstimatePdfBlob(estimateId, { template });
  await destination.write(blob);
}

export const pdfExportService = {
  buildEstimatePdfBlob,
  exportEstimatePdf,
};
