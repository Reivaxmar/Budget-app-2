// Rasterizes an uploaded PDF's first page into the same A4 raster background
// format resizeImageToA4 produces for image uploads (imageResize.ts) — so a
// user can pick a PDF (e.g. a vector letterhead exported from a design tool)
// as a cover/page background exactly like an image, and the rendering
// pipeline (EstimateDocument.tsx) never needs to know the difference.
import * as pdfjsLib from 'pdfjs-dist';
// Vite's `?url` import resolves to the built worker script's URL, which is
// exactly what GlobalWorkerOptions.workerSrc expects (pdf.js constructs the
// worker itself via `new Worker(workerSrc, { type: 'module' })`).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { A4_WIDTH_PX, A4_HEIGHT_PX } from './imageResize';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

/**
 * Renders page 1 of an uploaded PDF onto an A4 canvas (cover-fit: scaled up
 * and center-cropped as needed, never letterboxed or stretched), returning a
 * JPEG data URI ready to store on a Template's `page.backgroundImage` /
 * `cover.backgroundImage` — identical output shape to resizeImageToA4.
 */
export async function resizePdfToA4(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.max(A4_WIDTH_PX / baseViewport.width, A4_HEIGHT_PX / baseViewport.height);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH_PX;
  canvas.height = A4_HEIGHT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not supported in this environment.');
  }

  const offsetX = (A4_WIDTH_PX - viewport.width) / 2;
  const offsetY = (A4_HEIGHT_PX - viewport.height) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);
  ctx.translate(offsetX, offsetY);

  // pdfjs-dist 6.x's RenderParameters wants `canvas` (canvasContext alone is
  // deprecated, kept only for backwards compatibility).
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  return canvas.toDataURL('image/jpeg', 0.85);
}
