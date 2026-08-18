import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportEstimatePdf } from './pdfExportService';
import { buildEstimateDocumentData } from './documentDataService';
import { generateEstimatePdfBlob } from './pdfService';
import { templateService } from './templateService';
import type { EstimateDocumentData } from '../rendering/types';
import type { Template } from '../domain/models';

vi.mock('./documentDataService');
vi.mock('./pdfService');
vi.mock('./templateService');

const sampleData = {
  estimate: { id: 'estimate-1', estimateNumber: '001-26' },
} as unknown as EstimateDocumentData;

const sampleTemplate = { id: 'template-1', name: 'Standard' } as unknown as Template;

describe('exportEstimatePdf', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(buildEstimateDocumentData).mockResolvedValue(sampleData);
    vi.mocked(generateEstimatePdfBlob).mockResolvedValue(new Blob(['pdf-bytes']));
    vi.mocked(templateService.getDefaultTemplate).mockResolvedValue(sampleTemplate);

    clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy as unknown as () => void;
      }
      return el;
    });

    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    // @ts-expect-error jsdom/happy-dom don't implement these by default
    URL.createObjectURL = createObjectURLSpy;
    // @ts-expect-error jsdom/happy-dom don't implement these by default
    URL.revokeObjectURL = revokeObjectURLSpy;
  });

  it('builds document data for the given estimate and renders it with the default template', async () => {
    await exportEstimatePdf('estimate-1');

    expect(buildEstimateDocumentData).toHaveBeenCalledWith('estimate-1');
    expect(templateService.getDefaultTemplate).toHaveBeenCalled();
    expect(generateEstimatePdfBlob).toHaveBeenCalledWith(sampleData, sampleTemplate);
  });

  it('uses an explicitly given template instead of the default', async () => {
    const customTemplate = { id: 'template-2', name: 'Compact' } as unknown as Template;

    await exportEstimatePdf('estimate-1', customTemplate);

    expect(templateService.getDefaultTemplate).not.toHaveBeenCalled();
    expect(generateEstimatePdfBlob).toHaveBeenCalledWith(sampleData, customTemplate);
  });

  it('triggers a browser download named after the estimate number', async () => {
    await exportEstimatePdf('estimate-1');

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('falls back to the estimate id for the filename when no estimate number is set yet', async () => {
    vi.mocked(buildEstimateDocumentData).mockResolvedValue({
      estimate: { id: 'draft-1', estimateNumber: '' },
    } as unknown as EstimateDocumentData);

    let capturedDownload = '';
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'download', {
          set: (value: string) => {
            capturedDownload = value;
          },
          get: () => capturedDownload,
        });
        el.click = clickSpy as unknown as () => void;
      }
      return el;
    });

    await exportEstimatePdf('draft-1');

    expect(capturedDownload).toBe('estimate-draft-1.pdf');
  });
});
