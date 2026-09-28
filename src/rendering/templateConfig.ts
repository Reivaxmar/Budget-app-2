// Rendering-layer helpers for the template system (SPECS.md §9). The
// structured template shape itself (`TemplateConfig`/`Template`) is owned by
// the domain layer (src/domain/models.ts) so both the Templates screen
// (persistence) and the renderer (consumption) share one definition — this
// file only re-exports a type alias for readability at render call sites,
// plus the built-in default template and a small column-value resolver.

import type { LineItem, TableColumnConfig, TemplateConfig } from '../domain/models';

export type { TableColumnKey, TableColumnConfig, CoverPosition } from '../domain/models';

/** Alias kept for readability where this config is used purely for rendering. */
export type DocumentTemplateConfig = TemplateConfig;

export const defaultDocumentTemplate: DocumentTemplateConfig = {
  page: {
    size: 'A4',
    marginPt: 48,
  },
  typography: {
    fontFamily: 'Helvetica',
    baseFontSize: 9,
    titleFontSize: 22,
    headingFontSize: 12,
  },
  colors: {
    text: '#1a1a1a',
    muted: '#666666',
    tableHeaderBackground: '#eeeeee',
    borderColor: '#cccccc',
  },
  cover: {
    showCreationLocationDate: true,
    showSlogan: true,
    headerPosition: 'top-left',
    headerOffsetX: 0,
    headerOffsetY: 0,
    subjectPosition: 'middle-center',
    subjectOffsetX: 0,
    subjectOffsetY: 0,
  },
  header: {
    showEstimateNumberAndDate: true,
  },
  footer: {
    showPageNumbers: true,
    showCompanyInfo: true,
  },
  table: {
    showBorders: true,
    showChapterSubtotal: true,
    columns: [
      { key: 'itemNumber', label: 'Item', width: '8%' },
      { key: 'description', label: 'Description', width: '44%' },
      { key: 'unit', label: 'Unit', width: '10%', align: 'center' },
      { key: 'quantity', label: 'Qty', width: '12%', align: 'right' },
      { key: 'unitPrice', label: 'Unit price', width: '13%', align: 'right' },
      { key: 'amount', label: 'Amount', width: '13%', align: 'right' },
    ],
  },
  finalPage: {
    totalLabel: 'Total',
    signatureLabel: 'Conforme cliente',
    noteTitle: 'Condiciones del presupuesto',
    noteContent: '',
  },
};

/** Font sizes (pt) for every individually sizable part of the document. */
export interface ResolvedFontSizes {
  coverHeader: number;
  coverSubject: number;
  coverSlogan: number;
  footer: number;
  noteTitle: number;
  noteContent: number;
  total: number;
  signature: number;
}

/**
 * Resolves each part's font size: the template's explicit value when set,
 * otherwise the historical size derived from the body size. Shared by the
 * renderer and the template editor (which shows these as placeholders).
 */
export function resolveFontSizes(template: DocumentTemplateConfig): ResolvedFontSizes {
  const base = template.typography.baseFontSize;
  return {
    coverHeader: template.cover.headerFontSize ?? base,
    coverSubject: template.typography.titleFontSize,
    coverSlogan: template.cover.sloganFontSize ?? base + 2,
    footer: template.footer.fontSize ?? base - 1,
    noteTitle: template.finalPage.noteTitleFontSize ?? base + 1,
    noteContent: template.finalPage.noteContentFontSize ?? base,
    total: template.finalPage.totalFontSize ?? base + 4,
    signature: template.finalPage.signatureFontSize ?? base,
  };
}

/** Resolves the display value for a table cell for a given column and line item. */
export function resolveColumnValue(
  column: TableColumnConfig,
  item: LineItem,
  itemNumber: string,
  formatCurrency: (amount: number) => string
): string {
  switch (column.key) {
    case 'itemNumber':
      return itemNumber;
    case 'description':
      return item.description;
    case 'unit':
      return item.unit;
    case 'quantity':
      return String(item.quantity);
    case 'unitPrice':
      return formatCurrency(item.unitPrice);
    case 'amount':
      return formatCurrency(item.amount);
    default:
      return '';
  }
}
