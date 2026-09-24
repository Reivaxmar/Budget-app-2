// Shared pdfjs-dist setup for every place in the app that parses/renders a
// PDF in the browser (PdfViewerModal, pdfBackgroundResize) — importing this
// module wires the worker once, globally.
import * as pdfjsLib from 'pdfjs-dist';
// Vite's `?url` import resolves to the built worker script's URL, which is
// exactly what GlobalWorkerOptions.workerSrc expects (pdf.js constructs the
// worker itself via `new Worker(workerSrc, { type: 'module' })`).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

// Without this, pdfjs falls back to synthesizing missing glyph data itself
// for any standard (non-embedded) font — a path that references Node's
// `Buffer` global, which doesn't exist in a browser/Tauri webview and fails
// silently with a stream of "Can't find variable: Buffer" console warnings
// (harmless — pdfjs catches it and just renders with a substituted font —
// but avoidable). The actual font data is a one-time copy of pdfjs-dist's
// own `standard_fonts/` directory into `public/pdfjs/standard_fonts/`
// (re-copy it if the pdfjs-dist version is ever bumped) so it's served as a
// static asset pdfjs can fetch by plain URL.
export const PDFJS_STANDARD_FONT_DATA_URL = `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`;

export { pdfjsLib };
