import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PdfViewerModal } from './PdfViewerModal';
import { pdfjsLib } from '../utils/pdfjsConfig';
import '@testing-library/jest-dom';

// The real pdfjs-dist does its actual PDF parsing/rendering work off a
// worker thread and needs the standard-fonts asset set up (see
// pdfjsConfig.ts) — none of which this component-level test cares about. A
// thin fake document/page pair lets us drive the component's own loading/
// ready/error states and zoom behavior directly.
vi.mock('../utils/pdfjsConfig', () => ({
  pdfjsLib: { getDocument: vi.fn() },
  PDFJS_STANDARD_FONT_DATA_URL: '/pdfjs/standard_fonts/',
}));

function fakePage() {
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 141 * scale }),
    render: () => ({ promise: Promise.resolve() }),
  };
}

function fakePdfDocument(numPages: number) {
  return { numPages, getPage: vi.fn(async () => fakePage()) };
}

const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' });

describe('PdfViewerModal', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // happy-dom's canvas has no real 2D rendering backend (getContext('2d')
    // returns null), which would make the component skip every page (see
    // its `if (!context) continue` guard) and never actually append a
    // canvas. Stub a context so pages render as they would in a browser.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('shows a loading state while the PDF is being parsed, then hides it once ready', async () => {
    let resolveDocument!: (doc: unknown) => void;
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: new Promise((resolve) => {
        resolveDocument = resolve;
      }),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={vi.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveDocument(fakePdfDocument(1));

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
  });

  it('renders one canvas per PDF page once parsing succeeds', async () => {
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(fakePdfDocument(3)),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const { container } = render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(container.querySelectorAll('canvas.pdf-viewer-page')).toHaveLength(3);
    });
  });

  it('shows the given title', async () => {
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(fakePdfDocument(1)),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Estimate 001-26' })).toBeInTheDocument();
  });

  it('shows an error message when the PDF fails to load', async () => {
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.reject(new Error('boom')),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={vi.fn()} />);

    expect(await screen.findByText(/failed to display the pdf preview/i)).toBeInTheDocument();
  });

  it('calls onClose when the Close button is clicked', async () => {
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(fakePdfDocument(1)),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);
    const onClose = vi.fn();

    render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={onClose} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the dimmed backdrop (not the modal content) is clicked', async () => {
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(fakePdfDocument(1)),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);
    const onClose = vi.fn();

    const { container } = render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={onClose} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(container.querySelector('.pdf-viewer-overlay')!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal content itself', async () => {
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(fakePdfDocument(1)),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);
    const onClose = vi.fn();

    render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={onClose} />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('heading', { name: 'Estimate 001-26' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  describe('zoom controls', () => {
    async function renderReady() {
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(fakePdfDocument(1)),
      } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

      render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={vi.fn()} />);
      await screen.findByText('100%');
    }

    it('starts at 100% zoom, with zoom out enabled and zoom in enabled', async () => {
      await renderReady();

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zoom in/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /zoom out/i })).not.toBeDisabled();
    });

    it('increases zoom by 25 percentage points per click', async () => {
      await renderReady();

      fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
      expect(screen.getByText('125%')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('decreases zoom by 25 percentage points per click and disables zoom out at the 50% floor', async () => {
      await renderReady();

      const zoomOut = screen.getByRole('button', { name: /zoom out/i });
      fireEvent.click(zoomOut); // 75%
      fireEvent.click(zoomOut); // 50%

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(zoomOut).toBeDisabled();

      // One more click past the floor must not go negative.
      fireEvent.click(zoomOut);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('disables zoom in at the 250% ceiling', async () => {
      await renderReady();

      const zoomIn = screen.getByRole('button', { name: /zoom in/i });
      for (let i = 0; i < 6; i += 1) {
        fireEvent.click(zoomIn);
      }

      expect(screen.getByText('250%')).toBeInTheDocument();
      expect(zoomIn).toBeDisabled();
    });

    it('applies the zoom level as each canvas page’s CSS width', async () => {
      await renderReady();

      const canvas = document.querySelector('canvas.pdf-viewer-page') as HTMLCanvasElement;
      expect(canvas.style.width).toBe('760px');

      fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));

      expect(canvas.style.width).toBe('950px');
    });

    it('resets to 100% zoom when a new PDF (a different blob) is opened', async () => {
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(fakePdfDocument(1)),
      } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

      const { rerender } = render(<PdfViewerModal blob={blob} title="Estimate 001-26" onClose={vi.fn()} />);
      await screen.findByText('100%');

      fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
      expect(screen.getByText('125%')).toBeInTheDocument();

      const secondBlob = new Blob(['other-pdf-bytes'], { type: 'application/pdf' });
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(fakePdfDocument(1)),
      } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

      rerender(<PdfViewerModal blob={secondBlob} title="Estimate 002-26" onClose={vi.fn()} />);

      await waitFor(() => expect(screen.getByText('100%')).toBeInTheDocument());
    });
  });
});
