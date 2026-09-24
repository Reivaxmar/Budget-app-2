import React from 'react';
import { useTranslation } from 'react-i18next';
import { pdfjsLib, PDFJS_STANDARD_FONT_DATA_URL } from '../utils/pdfjsConfig';
import { closeOnOverlayClick } from '../utils/modal';
import './PdfViewerModal.css';

// A page's CSS display width at 100% zoom. Canvases are rendered at
// RENDER_SCALE_MULTIPLIER times this (an intrinsic-resolution cushion) so
// zooming in stays crisp up to MAX_ZOOM instead of visibly upscaling a
// canvas rendered only for the 100% size.
const BASE_DISPLAY_WIDTH_PX = 760;
const RENDER_SCALE_MULTIPLIER = 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

export interface PdfViewerModalProps {
  /** The already-generated PDF to display — never written to disk. */
  blob: Blob;
  title: string;
  onClose: () => void;
}

/**
 * In-app PDF viewer: renders every page of `blob` onto its own canvas via
 * pdfjs-dist (the same rendering engine already used to rasterize uploaded
 * PDF backgrounds, see pdfBackgroundResize.ts) so a user can look at a
 * generated document — a template preview, an estimate export — without
 * saving it to disk first, consistently in both the browser dev server and
 * the packaged Tauri app (whose native webview can't be relied on to offer
 * its own inline PDF viewer on every platform).
 */
export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ blob, title, onClose }) => {
  const { t } = useTranslation();
  const pagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    let cancelled = false;

    async function renderPages() {
      setStatus('loading');
      setZoom(1);
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const pdfDocument = await pdfjsLib.getDocument({
          data: arrayBuffer,
          standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
        }).promise;
        const container = pagesContainerRef.current;
        if (cancelled || !container) {
          return;
        }
        container.innerHTML = '';

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          if (cancelled) {
            return;
          }

          const unscaledViewport = page.getViewport({ scale: 1 });
          // Rendered at a higher intrinsic resolution than the 100%-zoom
          // display width, so zooming in (up to MAX_ZOOM) enlarges an
          // already-detailed canvas instead of visibly upscaling it.
          const scale = (BASE_DISPLAY_WIDTH_PX * RENDER_SCALE_MULTIPLIER) / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-viewer-page';
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${BASE_DISPLAY_WIDTH_PX}px`;
          const context = canvas.getContext('2d');
          if (!context) {
            continue;
          }

          await page.render({ canvas, canvasContext: context, viewport }).promise;
          if (cancelled) {
            return;
          }
          container.appendChild(canvas);
        }

        if (!cancelled) {
          setStatus('ready');
        }
      } catch (err) {
        console.error('Failed to render PDF preview:', err);
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    renderPages();

    return () => {
      cancelled = true;
    };
  }, [blob]);

  // Zooming only resizes the already-rendered canvases (via CSS width, which
  // keeps each page's aspect ratio automatically) rather than re-rendering
  // them through pdfjs, so it stays instant.
  React.useEffect(() => {
    const container = pagesContainerRef.current;
    if (!container) {
      return;
    }
    container.querySelectorAll<HTMLCanvasElement>('.pdf-viewer-page').forEach((canvas) => {
      canvas.style.width = `${BASE_DISPLAY_WIDTH_PX * zoom}px`;
    });
  }, [zoom, status]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));

  return (
    <div className="modal-overlay pdf-viewer-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal-content pdf-viewer-content">
        <div className="pdf-viewer-header">
          <h2>{title}</h2>
          <div className="pdf-viewer-header-actions">
            <div className="pdf-viewer-zoom" role="group" aria-label={t('pdfViewer.zoomGroupLabel')}>
              <button
                type="button"
                className="pdf-viewer-zoom-button"
                onClick={zoomOut}
                disabled={status !== 'ready' || zoom <= MIN_ZOOM}
                aria-label={t('pdfViewer.zoomOut')}
              >
                −
              </button>
              <span className="pdf-viewer-zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="pdf-viewer-zoom-button"
                onClick={zoomIn}
                disabled={status !== 'ready' || zoom >= MAX_ZOOM}
                aria-label={t('pdfViewer.zoomIn')}
              >
                +
              </button>
            </div>
            <button type="button" className="cancel-button" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        </div>
        {status === 'loading' && <p>{t('common.loading')}</p>}
        {status === 'error' && <p className="error-message">{t('pdfViewer.loadError')}</p>}
        <div className="pdf-viewer-pages" ref={pagesContainerRef} hidden={status !== 'ready'} />
      </div>
    </div>
  );
};

export default PdfViewerModal;
