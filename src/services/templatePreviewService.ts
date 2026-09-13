import type { TemplateConfig } from '../domain/models';
import { resolveSaveDestination } from '../utils/saveFile';

/**
 * Renders a quick-look PDF for a template being edited — using representative
 * example estimate/customer/chapter data (mockEstimateDocumentData, the same
 * fixture the rendering tests exercise) so there's always something
 * substantial to look at, but the *company* identity (name, address, logo-
 * adjacent details, slogan) and creation location come from the user's own
 * saved company profile — "your info" — so header/footer/cover read exactly
 * like a real export would, without needing an actual estimate saved first.
 *
 * Downloaded the same way as a real estimate export (see
 * pdfExportService.exportEstimatePdf): the save destination is resolved
 * first — before any of the (potentially slow, cold-import) PDF-building
 * work — because a browser's save picker only stays available while the
 * click that triggered it is still an active user gesture.
 */
export async function previewTemplate(templateConfig: TemplateConfig, nameHint?: string): Promise<void> {
  const filename = `template-preview-${nameHint?.trim() || 'untitled'}.pdf`;

  const destination = await resolveSaveDestination(filename, [{ name: 'PDF', extensions: ['pdf'] }]);
  if (!destination) {
    return;
  }

  const [{ renderEstimateDocumentToBlob }, { mockEstimateDocumentData }, { companyProfileRepositoryClient }] =
    await Promise.all([
      import('../rendering/documentRenderingService'),
      import('../rendering/mockEstimateData'),
      import('../db/companyProfileRepositoryClient'),
    ]);

  const companyProfile = await companyProfileRepositoryClient.get();
  const data = {
    ...mockEstimateDocumentData,
    company: companyProfile.profile,
    creationLocation: companyProfile.creationLocation || mockEstimateDocumentData.creationLocation,
  };

  const blob = await renderEstimateDocumentToBlob(data, templateConfig);
  await destination.write(blob);
}

export const templatePreviewService = {
  previewTemplate,
};
