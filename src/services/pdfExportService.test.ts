import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildEstimatePdfBlob, exportEstimatePdf } from './pdfExportService';
import { buildEstimateDocumentData } from './documentDataService';
import { generateEstimatePdfBlob } from './pdfService';
import { templateService } from './templateService';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { EstimateDocumentData } from '../rendering/types';
import type { Template } from '../domain/models';

vi.mock('./documentDataService');
vi.mock('./pdfService');
vi.mock('./templateService');
vi.mock('@tauri-apps/plugin-dialog');
vi.mock('@tauri-apps/api/core');

const sampleData = {
  estimate: { id: 'estimate-1', estimateNumber: '001-26' },
} as unknown as EstimateDocumentData;

const sampleTemplate = { id: 'template-1', name: 'Standard' } as unknown as Template;

describe('buildEstimatePdfBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildEstimateDocumentData).mockResolvedValue(sampleData);
    vi.mocked(generateEstimatePdfBlob).mockResolvedValue(new Blob(['pdf-bytes']));
    vi.mocked(templateService.getDefaultTemplate).mockResolvedValue(sampleTemplate);
  });

  it('builds document data for the given estimate and renders it with the default template, without any save dialog', async () => {
    const blob = await buildEstimatePdfBlob('estimate-1');

    expect(blob).toBeInstanceOf(Blob);
    expect(buildEstimateDocumentData).toHaveBeenCalledWith('estimate-1');
    expect(templateService.getDefaultTemplate).toHaveBeenCalled();
    expect(generateEstimatePdfBlob).toHaveBeenCalledWith(sampleData, sampleTemplate);
  });

  it('uses the estimate’s own chosen template over the default one', async () => {
    const estimateTemplate = { id: 'template-2', name: 'Compact' } as unknown as Template;
    vi.mocked(buildEstimateDocumentData).mockResolvedValue({
      estimate: { id: 'estimate-1', estimateNumber: '001-26', templateId: 'template-2' },
    } as unknown as EstimateDocumentData);
    vi.mocked(templateService.getTemplate).mockResolvedValue(estimateTemplate);

    await buildEstimatePdfBlob('estimate-1');

    expect(templateService.getTemplate).toHaveBeenCalledWith('template-2');
    expect(templateService.getDefaultTemplate).not.toHaveBeenCalled();
    expect(generateEstimatePdfBlob).toHaveBeenCalledWith(expect.anything(), estimateTemplate);
  });

  it('uses an explicitly given template instead of the estimate’s own or the default', async () => {
    const customTemplate = { id: 'template-3', name: 'Custom' } as unknown as Template;

    await buildEstimatePdfBlob('estimate-1', { template: customTemplate });

    expect(templateService.getDefaultTemplate).not.toHaveBeenCalled();
    expect(generateEstimatePdfBlob).toHaveBeenCalledWith(sampleData, customTemplate);
  });

  it('swaps in the estimate’s own full template override in place of the resolved template’s config', async () => {
    const overrideConfig = {
      colors: { text: '#0000ff', muted: '#cccccc', tableHeaderBackground: '#111111', borderColor: '#222222' },
      typography: { fontFamily: 'Courier', baseFontSize: 10, titleFontSize: 24, headingFontSize: 14 },
    };
    vi.mocked(buildEstimateDocumentData).mockResolvedValue({
      estimate: { id: 'estimate-1', estimateNumber: '001-26', templateOverrides: overrideConfig },
    } as unknown as EstimateDocumentData);

    await buildEstimatePdfBlob('estimate-1');

    expect(generateEstimatePdfBlob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: sampleTemplate.id,
        colors: overrideConfig.colors,
        typography: overrideConfig.typography,
      })
    );
  });
});

describe('exportEstimatePdf', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  const originalCreateElement = document.createElement.bind(document);

  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(buildEstimateDocumentData).mockResolvedValue(sampleData);
    vi.mocked(generateEstimatePdfBlob).mockResolvedValue(new Blob(['pdf-bytes']));
    vi.mocked(templateService.getDefaultTemplate).mockResolvedValue(sampleTemplate);
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    delete (window as unknown as { isTauri?: boolean }).isTauri;
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });

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

  it('swaps in the estimate’s own full template override in place of the resolved template’s config', async () => {
    const resolvedTemplate = {
      id: 'template-1',
      name: 'Standard',
      colors: { text: '#ffffff', muted: '#cccccc', tableHeaderBackground: '#111111', borderColor: '#222222' },
      typography: { fontFamily: 'Helvetica', baseFontSize: 10, titleFontSize: 24, headingFontSize: 14 },
    } as unknown as Template;
    const overrideConfig = {
      colors: { text: '#0000ff', muted: '#cccccc', tableHeaderBackground: '#111111', borderColor: '#222222' },
      typography: { fontFamily: 'Courier', baseFontSize: 10, titleFontSize: 24, headingFontSize: 14 },
    };
    const dataWithOverrides = {
      estimate: {
        id: 'estimate-1',
        estimateNumber: '001-26',
        templateOverrides: overrideConfig,
      },
    } as unknown as EstimateDocumentData;

    vi.mocked(buildEstimateDocumentData).mockResolvedValue(dataWithOverrides);
    vi.mocked(templateService.getDefaultTemplate).mockResolvedValue(resolvedTemplate);

    await exportEstimatePdf('estimate-1');

    expect(generateEstimatePdfBlob).toHaveBeenCalledWith(
      dataWithOverrides,
      expect.objectContaining({
        id: 'template-1',
        colors: overrideConfig.colors,
        typography: overrideConfig.typography,
      })
    );
  });

  it('uses an explicitly given template instead of the default', async () => {
    const customTemplate = { id: 'template-2', name: 'Compact' } as unknown as Template;

    await exportEstimatePdf('estimate-1', { template: customTemplate });

    expect(templateService.getDefaultTemplate).not.toHaveBeenCalled();
    expect(generateEstimatePdfBlob).toHaveBeenCalledWith(sampleData, customTemplate);
  });

  it('triggers a browser download named after the given estimate number', async () => {
    await exportEstimatePdf('estimate-1', { estimateNumber: '001-26' });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('falls back to the estimate id for the filename when no estimate number is given', async () => {
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

  it('resolves the save destination before doing any of the slow PDF-building work', async () => {
    // Regression test: showSaveFilePicker() (and, defensively, the Tauri
    // dialog) must be asked for a location while the click that triggered
    // export is still an active user gesture. If we build/render the PDF
    // first, that gesture can expire and the picker throws on every
    // attempt. This asserts the actual call order, not just the outcome.
    const callOrder: string[] = [];
    vi.mocked(buildEstimateDocumentData).mockImplementation(async () => {
      callOrder.push('buildEstimateDocumentData');
      return sampleData;
    });
    vi.mocked(generateEstimatePdfBlob).mockImplementation(async () => {
      callOrder.push('generateEstimatePdfBlob');
      return new Blob(['pdf-bytes']);
    });
    (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = vi
      .fn()
      .mockImplementation(async () => {
        callOrder.push('showSaveFilePicker');
        return { createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }) };
      });

    await exportEstimatePdf('estimate-1');

    expect(callOrder).toEqual(['showSaveFilePicker', 'buildEstimateDocumentData', 'generateEstimatePdfBlob']);

    delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });

  describe('under Tauri', () => {
    beforeEach(() => {
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    });

    it('asks the user for a save location via the native dialog and writes the PDF there via the custom write_binary_file command', async () => {
      vi.mocked(save).mockResolvedValue('/home/user/Documents/estimate-001-26.pdf');
      vi.mocked(invoke).mockResolvedValue(undefined);

      await exportEstimatePdf('estimate-1', { estimateNumber: '001-26' });

      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ defaultPath: 'estimate-001-26.pdf' })
      );
      // Deliberately not `@tauri-apps/plugin-fs`'s writeFile: that plugin
      // restricts writes to paths pre-declared in the capability's
      // fs:scope, which a user-picked path won't be. write_binary_file is
      // a plain custom command, not subject to that scope.
      expect(invoke).toHaveBeenCalledWith('write_binary_file', {
        path: '/home/user/Documents/estimate-001-26.pdf',
        contents: expect.any(Array),
      });
      // The browser-download fallback must not also fire.
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('uses the native Tauri save dialog when the runtime signal is absent but the app is running in a Tauri webview', async () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: 'Mozilla/5.0 (X11; Linux x86_64) Tauri/1.0',
      });
      vi.mocked(save).mockResolvedValue('/home/user/Documents/estimate-001-26.pdf');
      vi.mocked(invoke).mockResolvedValue(undefined);

      await exportEstimatePdf('estimate-1', { estimateNumber: '001-26' });

      expect(save).toHaveBeenCalled();
      expect(invoke).toHaveBeenCalledWith('write_binary_file', {
        path: '/home/user/Documents/estimate-001-26.pdf',
        contents: expect.any(Array),
      });
    });

    it('does nothing (no error, no write) when the user cancels the native save dialog', async () => {
      vi.mocked(save).mockResolvedValue(null);

      await expect(exportEstimatePdf('estimate-1')).resolves.toBeUndefined();

      expect(invoke).not.toHaveBeenCalled();
      expect(clickSpy).not.toHaveBeenCalled();
      expect(buildEstimateDocumentData).not.toHaveBeenCalled();
    });
  });

  describe('via the File System Access API (non-Tauri browsers that support it)', () => {
    let writeSpy: ReturnType<typeof vi.fn>;
    let closeSpy: ReturnType<typeof vi.fn>;
    let showSaveFilePickerSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      writeSpy = vi.fn().mockResolvedValue(undefined);
      closeSpy = vi.fn().mockResolvedValue(undefined);
      showSaveFilePickerSpy = vi.fn().mockResolvedValue({
        createWritable: vi.fn().mockResolvedValue({ write: writeSpy, close: closeSpy }),
      });
      (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker =
        showSaveFilePickerSpy;
    });

    afterEach(() => {
      delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    });

    it('asks the user for a save location via the picker and writes the PDF there', async () => {
      await exportEstimatePdf('estimate-1', { estimateNumber: '001-26' });

      expect(showSaveFilePickerSpy).toHaveBeenCalledWith(
        expect.objectContaining({ suggestedName: 'estimate-001-26.pdf' })
      );
      expect(writeSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('does nothing (no error, no write) when the user cancels the picker', async () => {
      showSaveFilePickerSpy.mockRejectedValue(new DOMException('cancelled', 'AbortError'));

      await expect(exportEstimatePdf('estimate-1')).resolves.toBeUndefined();

      expect(writeSpy).not.toHaveBeenCalled();
      expect(clickSpy).not.toHaveBeenCalled();
      expect(buildEstimateDocumentData).not.toHaveBeenCalled();
    });
  });
});
