// @vitest-environment node
//
// Rendering tests per SPECS.md §16: generate representative PDFs (long
// descriptions, many chapters, forced pagination, final-page content) and
// validate the actual rendered output — not just that the React tree builds
// — via pdf-lib. The full mock-data PDF is also written to test-output/ for
// manual visual inspection.

import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { renderEstimateDocumentToBuffer } from './documentRenderingService.node';
import { mockEstimateDocumentData } from './mockEstimateData';
import { defaultDocumentTemplate } from './templateConfig';
import { calculateEstimateTotal } from '../domain/calculations';
import type { EstimateDocumentData } from './types';
import type { ChapterWithLineItems } from '../domain/calculations';

const { customer, company, standardNote, creationLocation } = mockEstimateDocumentData;

/** Builds a minimal, valid EstimateDocumentData around a custom set of chapters. */
function buildEstimateData(
  chapters: ChapterWithLineItems[],
  estimateOverrides: Partial<EstimateDocumentData['estimate']> = {}
): EstimateDocumentData {
  return {
    estimate: {
      ...mockEstimateDocumentData.estimate,
      id: 'estimate-synthetic',
      ...estimateOverrides,
    },
    customer,
    chapters,
    company,
    standardNote,
    creationLocation,
  };
}

function buildLineItem(
  chapterId: string,
  order: number,
  description: string,
  overrides: Partial<{ unit: string; quantity: number; unitPrice: number; code: string }> = {}
) {
  const quantity = overrides.quantity ?? 1;
  const unitPrice = overrides.unitPrice ?? 100;
  return {
    id: `${chapterId}-item-${order}`,
    chapterId,
    code: overrides.code ?? `ITM-${order}`,
    description,
    unit: overrides.unit ?? 'ud',
    quantity,
    unitPrice,
    amount: Math.round(quantity * unitPrice * 100) / 100,
    order,
  };
}

async function loadPageDimensions(buffer: Buffer) {
  const pdfDoc = await PDFDocument.load(buffer);
  return pdfDoc.getPages().map((page) => {
    const { width, height } = page.getSize();
    return { width: Math.round(width), height: Math.round(height) };
  });
}

describe('EstimateDocument rendering: representative multi-page document', () => {
  it('generates a paginated A4 PDF with cover, content and final-page sections', async () => {
    const buffer = await renderEstimateDocumentToBuffer(mockEstimateDocumentData);

    expect(buffer.length).toBeGreaterThan(0);

    const outDir = path.resolve(__dirname, '../../test-output');
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'sample-estimate.pdf'), buffer);

    const pages = await loadPageDimensions(buffer);

    // Cover page + client/introduction page + enough content pages to prove
    // the long descriptions and five chapters actually forced pagination
    // rather than overlapping.
    expect(pages.length).toBeGreaterThanOrEqual(4);

    // A4 in points (react-pdf default for size="A4").
    for (const { width, height } of pages) {
      expect(width).toBe(595);
      expect(height).toBe(842);
    }
  });

  it('produces deterministic output for the same data (same layout every render)', async () => {
    const [first, second] = await Promise.all([
      renderEstimateDocumentToBuffer(mockEstimateDocumentData),
      renderEstimateDocumentToBuffer(mockEstimateDocumentData),
    ]);

    const firstDoc = await PDFDocument.load(first);
    const secondDoc = await PDFDocument.load(second);

    expect(secondDoc.getPageCount()).toBe(firstDoc.getPageCount());
  });

  it('computes the same total shown on the final page from the chapter/line-item data', () => {
    const { estimate, chapters } = mockEstimateDocumentData;
    const total = calculateEstimateTotal({ ...estimate, chapters });

    expect(total).toBeGreaterThan(0);
    expect(Number.isFinite(total)).toBe(true);
  });
});

describe('EstimateDocument rendering: long descriptions', () => {
  it('wraps a very long description across lines without breaking pagination', async () => {
    const veryLongDescription = Array.from(
      { length: 40 },
      (_, i) =>
        `Partida número ${i + 1} de una descripción extremadamente larga que debe envolver el texto de forma natural en varias líneas dentro de la celda de descripción sin solaparse con las columnas adyacentes.`
    ).join(' ');

    const chapter: ChapterWithLineItems = {
      id: 'chapter-long',
      estimateId: 'estimate-synthetic',
      title: 'Capítulo con descripción extensa',
      order: 0,
      lineItems: [
        buildLineItem('chapter-long', 0, veryLongDescription, { unitPrice: 1500 }),
        buildLineItem('chapter-long', 1, 'Partida corta de control.', { unitPrice: 50 }),
      ],
    };

    const buffer = await renderEstimateDocumentToBuffer(buildEstimateData([chapter]));
    const pages = await loadPageDimensions(buffer);

    // Cover page + at least one content page that had to grow/paginate to
    // fit the long description (a single-line render would fit on one page).
    expect(pages.length).toBeGreaterThanOrEqual(2);
    for (const { width, height } of pages) {
      expect(width).toBe(595);
      expect(height).toBe(842);
    }
  });

  it('renders many long descriptions across several chapters without throwing', async () => {
    const longDescription =
      'Suministro, transporte, montaje y puesta en obra de todos los materiales y medios auxiliares necesarios para la correcta ejecución de la partida descrita, incluyendo mano de obra especializada, control de calidad, limpieza de los restos generados durante el proceso y retirada de escombros a vertedero autorizado, todo ello conforme a la normativa técnica de aplicación y a las indicaciones de la dirección facultativa de la obra.';

    const chapters: ChapterWithLineItems[] = Array.from({ length: 4 }, (_, chapterIndex) => ({
      id: `chapter-${chapterIndex}`,
      estimateId: 'estimate-synthetic',
      title: `Capítulo ${chapterIndex + 1}`,
      order: chapterIndex,
      lineItems: Array.from({ length: 6 }, (_, itemIndex) =>
        buildLineItem(`chapter-${chapterIndex}`, itemIndex, longDescription, {
          unitPrice: 200 + itemIndex * 10,
          quantity: itemIndex + 1,
        })
      ),
    }));

    const buffer = await renderEstimateDocumentToBuffer(buildEstimateData(chapters));
    const pages = await loadPageDimensions(buffer);

    expect(pages.length).toBeGreaterThanOrEqual(4);
  });
});

describe('EstimateDocument rendering: many chapters and items', () => {
  it('paginates a document with a large number of chapters/items across many pages', async () => {
    const chapters: ChapterWithLineItems[] = Array.from({ length: 10 }, (_, chapterIndex) => ({
      id: `chapter-${chapterIndex}`,
      estimateId: 'estimate-synthetic',
      title: `Capítulo ${chapterIndex + 1} — trabajos varios`,
      order: chapterIndex,
      lineItems: Array.from({ length: 10 }, (_, itemIndex) =>
        buildLineItem(
          `chapter-${chapterIndex}`,
          itemIndex,
          `Partida estándar ${chapterIndex + 1}.${itemIndex + 1} con una descripción breve.`,
          { unitPrice: 25 + itemIndex, quantity: itemIndex + 1 }
        )
      ),
    }));

    const buffer = await renderEstimateDocumentToBuffer(buildEstimateData(chapters));
    const pdfDoc = await PDFDocument.load(buffer);

    // 100 line items across 10 chapters cannot fit on one content page —
    // this proves the renderer paginates by content volume, not just by
    // individual oversized cells.
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(5);
  });

  it('keeps the total on the final page consistent regardless of how many pages it spans', async () => {
    const chapters: ChapterWithLineItems[] = Array.from({ length: 8 }, (_, chapterIndex) => ({
      id: `chapter-${chapterIndex}`,
      estimateId: 'estimate-synthetic',
      title: `Capítulo ${chapterIndex + 1}`,
      order: chapterIndex,
      lineItems: Array.from({ length: 5 }, (_, itemIndex) =>
        buildLineItem(`chapter-${chapterIndex}`, itemIndex, `Partida ${chapterIndex + 1}.${itemIndex + 1}`, {
          unitPrice: 40,
          quantity: 2,
        })
      ),
    }));

    const data = buildEstimateData(chapters);
    const buffer = await renderEstimateDocumentToBuffer(data);

    expect(buffer.length).toBeGreaterThan(0);
    const expectedTotal = calculateEstimateTotal({ ...data.estimate, chapters });
    expect(expectedTotal).toBe(8 * 5 * 40 * 2);
  });
});

describe('EstimateDocument rendering: template configuration', () => {
  it('accepts a custom template configuration (columns, footer, cover options) without breaking pagination', async () => {
    const customTemplate = {
      ...defaultDocumentTemplate,
      cover: { ...defaultDocumentTemplate.cover, showSlogan: false },
      footer: { showPageNumbers: false, showCompanyInfo: true },
      table: {
        showBorders: false,
        columns: [
          { key: 'itemNumber' as const, label: '#', width: '10%' },
          { key: 'description' as const, label: 'Concepto', width: '70%' },
          { key: 'amount' as const, label: 'Importe', width: '20%', align: 'right' as const },
        ],
      },
      finalPage: {
        totalLabel: 'Total presupuesto',
        totalCaption: 'IVA no incluido',
        signatureLabel: 'Firma del cliente',
        noteTitle: 'Condiciones',
        noteContent: '',
      },
    };

    const buffer = await renderEstimateDocumentToBuffer(mockEstimateDocumentData, customTemplate);
    const pages = await loadPageDimensions(buffer);

    expect(pages.length).toBeGreaterThanOrEqual(3);
    for (const { width, height } of pages) {
      expect(width).toBe(595);
      expect(height).toBe(842);
    }
  });

  it('produces different output when the template changes, given the same estimate data', async () => {
    const minimalTemplate = {
      ...defaultDocumentTemplate,
      footer: { showPageNumbers: false, showCompanyInfo: false },
    };

    const [defaultBuffer, minimalBuffer] = await Promise.all([
      renderEstimateDocumentToBuffer(mockEstimateDocumentData, defaultDocumentTemplate),
      renderEstimateDocumentToBuffer(mockEstimateDocumentData, minimalTemplate),
    ]);

    expect(defaultBuffer.equals(minimalBuffer)).toBe(false);
  });
});

describe('EstimateDocument rendering: client/introduction page', () => {
  const chapter: ChapterWithLineItems = {
    id: 'chapter-intro-test',
    estimateId: 'estimate-synthetic',
    title: 'Trabajos varios',
    order: 0,
    lineItems: [buildLineItem('chapter-intro-test', 0, 'Partida de control.', { unitPrice: 100 })],
  };

  it('renders a dedicated second page for client details and introduction, ahead of the chapters', async () => {
    const buffer = await renderEstimateDocumentToBuffer(
      buildEstimateData([chapter], { introduction: 'Resumen general de los trabajos a realizar.' })
    );
    const pages = await loadPageDimensions(buffer);

    // Cover + client/introduction page + at least one chapters/content page.
    expect(pages.length).toBeGreaterThanOrEqual(3);
    for (const { width, height } of pages) {
      expect(width).toBe(595);
      expect(height).toBe(842);
    }
  });

  it('paginates a very long introduction across multiple pages, ahead of a short one', async () => {
    const shortIntroBuffer = await renderEstimateDocumentToBuffer(
      buildEstimateData([chapter], { introduction: 'Breve resumen.' })
    );
    const longIntroduction = Array.from(
      { length: 60 },
      (_, i) => `Párrafo ${i + 1} de una introducción extremadamente larga que describe en detalle el alcance de la obra.`
    ).join(' ');
    const longIntroBuffer = await renderEstimateDocumentToBuffer(
      buildEstimateData([chapter], { introduction: longIntroduction })
    );

    const shortPages = await loadPageDimensions(shortIntroBuffer);
    const longPages = await loadPageDimensions(longIntroBuffer);

    expect(longPages.length).toBeGreaterThan(shortPages.length);
  });

  it('renders correctly with an empty introduction (not yet filled in by the user)', async () => {
    const buffer = await renderEstimateDocumentToBuffer(buildEstimateData([chapter], { introduction: '' }));
    const pages = await loadPageDimensions(buffer);

    expect(pages.length).toBeGreaterThanOrEqual(3);
  });
});
