import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import EstimateEditorPage from './EstimateEditorPage';
import {
  chapterRepositoryClient,
  lineItemRepositoryClient,
  estimateRepositoryClient,
} from '../db/estimateRepositoryClient';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { appSettingsRepositoryClient } from '../db/appSettingsRepositoryClient';
import { buildEstimatePdfBlob } from '../services/pdfExportService';
import { notify } from '../notifications';
import { Estimate, Chapter } from '../domain/models';
import '@testing-library/jest-dom';

vi.mock('../db/estimateRepositoryClient');
vi.mock('../db/customerRepositoryClient');
vi.mock('../db/itemRepositoryClient');
vi.mock('../db/appSettingsRepositoryClient');
vi.mock('../services/pdfExportService');
vi.mock('../notifications');

// PdfViewerModal's own rendering (pdfjs-dist, canvases, zoom) is covered by
// PdfViewerModal.test.tsx — stubbed here to a minimal probe so this test can
// assert *that* it's opened with the right content, without dragging
// pdfjs-dist through a page-level test that isn't about the viewer itself.
vi.mock('../components/PdfViewerModal', () => ({
  PdfViewerModal: ({ title, onClose }: { title: string; onClose: () => void }) => (
    <div data-testid="pdf-viewer-modal">
      <span>{title}</span>
      <button onClick={onClose}>mock-close</button>
    </div>
  ),
}));

describe('EstimateEditorPage — PDF preview', () => {
  const estimate: Estimate = {
    id: 'estimate-1',
    estimateNumber: '001-26',
    year: 2026,
    customerId: 'customer-1',
    subject: 'Test subject',
    site: 'Test site',
    creationDate: new Date('2026-01-01').toISOString(),
    status: 'draft',
    taxRate: 0,
    introduction: '',
    templateId: 'template-1',
    finalNoteTitle: '',
    finalNoteContent: '',
    templateOverrides: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const chapter: Chapter = {
    id: 'chapter-1',
    estimateId: estimate.id,
    title: 'Chapter 1',
    order: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(estimateRepositoryClient.findById).mockResolvedValue(estimate);
    vi.mocked(chapterRepositoryClient.findByEstimateId).mockResolvedValue([chapter]);
    vi.mocked(lineItemRepositoryClient.findByChapterId).mockResolvedValue([]);
    vi.mocked(customerRepositoryClient.findMany).mockResolvedValue([]);
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue([]);
    vi.mocked(appSettingsRepositoryClient.get).mockResolvedValue({ defaultTaxRate: 0, nextEstimateNumber: 1 });
  });

  const renderEditPage = () =>
    render(
      <MemoryRouter initialEntries={[`/estimates/${estimate.id}/edit`]}>
        <Routes>
          <Route path="/estimates/:id/edit" element={<EstimateEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('renders the PDF and opens the in-app viewer when "Preview" is clicked', async () => {
    const blob = new Blob(['pdf-bytes']);
    vi.mocked(buildEstimatePdfBlob).mockResolvedValue(blob);

    renderEditPage();

    fireEvent.click(await screen.findByRole('button', { name: /^preview$/i }));

    await waitFor(() => {
      expect(buildEstimatePdfBlob).toHaveBeenCalledWith(estimate.id);
    });
    const viewerModal = await screen.findByTestId('pdf-viewer-modal');
    expect(viewerModal).toBeInTheDocument();
    expect(viewerModal).toHaveTextContent(/edit estimate 001-26/i);
  });

  it('shows an error toast and does not open the viewer when rendering the PDF fails', async () => {
    vi.mocked(buildEstimatePdfBlob).mockRejectedValue(new Error('render blew up'));

    renderEditPage();

    fireEvent.click(await screen.findByRole('button', { name: /^preview$/i }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('render blew up', 'error');
    });
    expect(screen.queryByTestId('pdf-viewer-modal')).not.toBeInTheDocument();
  });

  it('closes the viewer when it reports onClose', async () => {
    vi.mocked(buildEstimatePdfBlob).mockResolvedValue(new Blob(['pdf-bytes']));

    renderEditPage();
    fireEvent.click(await screen.findByRole('button', { name: /^preview$/i }));
    await screen.findByTestId('pdf-viewer-modal');

    fireEvent.click(screen.getByText('mock-close'));

    expect(screen.queryByTestId('pdf-viewer-modal')).not.toBeInTheDocument();
  });

  it('disables the Preview button while a preview is being generated', async () => {
    let resolveBlob!: (blob: Blob) => void;
    vi.mocked(buildEstimatePdfBlob).mockReturnValue(
      new Promise((resolve) => {
        resolveBlob = resolve;
      })
    );

    renderEditPage();
    const previewButton = await screen.findByRole('button', { name: /^preview$/i });
    fireEvent.click(previewButton);

    expect(await screen.findByRole('button', { name: /generating preview/i })).toBeDisabled();

    resolveBlob(new Blob(['pdf-bytes']));
    await screen.findByTestId('pdf-viewer-modal');
  });

  it('does not show a Preview button for a not-yet-saved (new) estimate', async () => {
    vi.mocked(customerRepositoryClient.findMany).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/estimates/new']}>
        <Routes>
          <Route path="/estimates/new" element={<EstimateEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole('button', { name: /^save estimate$/i });

    expect(screen.queryByRole('button', { name: /^preview$/i })).not.toBeInTheDocument();
    expect(buildEstimatePdfBlob).not.toHaveBeenCalled();
  });
});
