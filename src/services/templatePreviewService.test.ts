import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTemplatePreviewBlob, downloadTemplatePreview } from './templatePreviewService';
import { renderEstimateDocumentToBlob } from '../rendering/documentRenderingService';
import { mockEstimateDocumentData } from '../rendering/mockEstimateData';
import { companyProfileRepositoryClient } from '../db/companyProfileRepositoryClient';
import type { TemplateConfig, UserProfile } from '../domain/models';

vi.mock('../rendering/documentRenderingService');
vi.mock('../rendering/mockEstimateData');
vi.mock('../db/companyProfileRepositoryClient');

const templateConfig = { page: { size: 'A4', marginPt: 48 } } as unknown as TemplateConfig;

const companyProfile: UserProfile = {
  id: 'company-profile',
  name: 'Reformas Ortiz S.L.',
  address: 'Avinguda Diagonal 512',
  postalCode: '08006 Barcelona',
  phone: '+34 93 200 44 11',
  email: 'info@reformasortiz.example',
  taxId: 'B12345678',
  slogan: 'Construimos confianza',
};

describe('buildTemplatePreviewBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderEstimateDocumentToBlob).mockResolvedValue(new Blob(['pdf-bytes']));
    vi.mocked(companyProfileRepositoryClient.get).mockResolvedValue({
      profile: companyProfile,
      creationLocation: 'Barcelona',
    });
  });

  it('renders the mock estimate fixture with the given template config, no save dialog', async () => {
    const blob = await buildTemplatePreviewBlob(templateConfig);

    expect(blob).toBeInstanceOf(Blob);
    expect(renderEstimateDocumentToBlob).toHaveBeenCalledWith(
      expect.objectContaining({ estimate: mockEstimateDocumentData.estimate, chapters: mockEstimateDocumentData.chapters }),
      templateConfig
    );
  });

  it('substitutes the signed-in user’s own saved company profile in place of the mock one', async () => {
    await buildTemplatePreviewBlob(templateConfig);

    expect(renderEstimateDocumentToBlob).toHaveBeenCalledWith(
      expect.objectContaining({ company: companyProfile, creationLocation: 'Barcelona' }),
      templateConfig
    );
  });

  it('falls back to the mock fixture’s creation location when the company profile has none set', async () => {
    vi.mocked(companyProfileRepositoryClient.get).mockResolvedValue({
      profile: companyProfile,
      creationLocation: '',
    });

    await buildTemplatePreviewBlob(templateConfig);

    expect(renderEstimateDocumentToBlob).toHaveBeenCalledWith(
      expect.objectContaining({ creationLocation: mockEstimateDocumentData.creationLocation }),
      templateConfig
    );
  });
});

describe('downloadTemplatePreview', () => {
  const originalCreateElement = document.createElement.bind(document);
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderEstimateDocumentToBlob).mockResolvedValue(new Blob(['pdf-bytes']));
    vi.mocked(companyProfileRepositoryClient.get).mockResolvedValue({
      profile: companyProfile,
      creationLocation: 'Barcelona',
    });

    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;

    clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy as unknown as () => void;
      }
      return el;
    });
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('downloads a file named after the given template name', async () => {
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

    await downloadTemplatePreview(templateConfig, 'Standard (BG)');

    expect(capturedDownload).toBe('template-preview-Standard (BG).pdf');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('falls back to "untitled" when no name hint is given', async () => {
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

    await downloadTemplatePreview(templateConfig);

    expect(capturedDownload).toBe('template-preview-untitled.pdf');
  });

  it('does nothing (no render, no download) when the user cancels the save picker', async () => {
    (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = vi
      .fn()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError'));

    await expect(downloadTemplatePreview(templateConfig, 'Standard')).resolves.toBeUndefined();

    expect(renderEstimateDocumentToBlob).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
