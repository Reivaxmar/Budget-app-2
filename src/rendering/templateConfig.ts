// Rendering-layer helpers for the template system (SPECS.md §9). The
// structured template shape itself (`TemplateConfig`/`Template`) is owned by
// the domain layer (src/domain/models.ts) so both the Templates screen
// (persistence) and the renderer (consumption) share one definition — this
// file only re-exports a type alias for readability at render call sites,
// plus the built-in default template and a small column-value resolver.

import type { LineItem, TableColumnConfig, TemplateConfig } from '../domain/models';

export type { TableColumnKey, TableColumnConfig } from '../domain/models';

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
    totalCaption: 'IVA no incluido / VAT not included',
    signatureLabel: 'Conforme cliente',
    noteTitle: 'Condiciones del presupuesto',
    noteContent: '',
  },
};

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
