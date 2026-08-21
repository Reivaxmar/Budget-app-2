// Domain models for the Construction Estimate & Quote Management Application
// Based on SPECS.md

export interface Estimate {
  id: string
  estimateNumber: string // e.g., "001-24"
  year: number
  customerId: string // Reference to Customer
  subject: string
  site: string
  creationDate: string // ISO date string
  status: string // e.g., 'draft', 'issued', 'accepted'
  taxRate: number // Percentage (e.g., 19 for 19%)
  introduction: string // Overall description of the work, shown on the document's second page
  templateId: string // Which Template governs this estimate's export/presentation
  // Final-page note snapshot: pre-filled from the chosen Template's
  // finalPage.noteTitle/noteContent when the estimate is created (or the
  // template is changed on a not-yet-customized estimate), then editable
  // per-estimate from there. Stored on the estimate itself (not just a
  // reference to the template) so a later edit to the template never
  // changes an already-issued estimate's rendered output.
  finalNoteTitle: string
  finalNoteContent: string
  // A full per-estimate copy of the chosen Template's presentation config
  // (page layout, typography, colors, cover/header/footer toggles, table
  // columns, final-page labels) — e.g. a one-off client wants blue body text
  // instead of the template's white. `null` means this estimate has no
  // customization of its own and simply follows whatever the selected
  // Template currently says; once set, it's a full snapshot (not merged
  // field-by-field with the template), so editing the shared template later
  // never changes an estimate that already has an override.
  templateOverrides: TemplateConfig | null
  // Stamped on creation and every header save (see estimateService); drives
  // the estimates list's default "last edited" sort.
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  address: string
  phone: string
  email: string
  taxId: string
  notes: string
}

export interface Chapter {
  id: string
  estimateId: string // Reference to Estimate
  title: string
  order: number // For sorting chapters within an estimate
}

export interface LineItem {
  id: string
  chapterId: string // Reference to Chapter
  code: string // Item code from library or custom
  description: string
  unit: string // e.g., 'm²', 'pcs', 'h'
  quantity: number
  unitPrice: number
  amount: number // quantity * unitPrice (should be calculated, but stored for convenience)
  order: number // For sorting line items within a chapter
}

export interface Item {
  id: string
  // Auto-generated, format "XXXYYYY" — XXX is the item's category's creation
  // order (see ItemCategory.order), YYYY is a per-category sequence number.
  // Never entered by hand; see itemService.generateItemCode.
  code: string
  description: string // Default description used when inserted into an estimate
  unit: string // Default unit, e.g. 'm²', 'pcs', 'h'
  defaultPrice: number // Default unit price
  categoryId: string // Reference to ItemCategory
  keywords: string // Optional search keywords, empty string if none
}

export interface ItemCategory {
  id: string
  name: string
  // Sequence number assigned in creation order (1 for the built-in "misc"
  // category seeded on first use, incrementing from there). Forms the XXX
  // part of generated item codes and never changes once assigned, even if
  // an earlier category is later deleted.
  order: number
}

// A template controls document *presentation* only — it never carries
// estimate data (SPECS.md §9, §21). The shape here is a constrained,
// structured configuration (page layout, typography, colors, cover,
// header, footer, table columns, final-page wording) rather than a
// free-form/WYSIWYG layout, so rendering stays deterministic.

export type TableColumnKey =
  | 'itemNumber'
  | 'description'
  | 'unit'
  | 'quantity'
  | 'unitPrice'
  | 'amount'

export interface TableColumnConfig {
  key: TableColumnKey
  label: string
  /** CSS-style percentage width, e.g. "44%". Widths across columns should sum to 100%. */
  width: string
  align?: 'left' | 'center' | 'right'
}

/** The resolved presentation configuration a template supplies to the renderer. */
export interface TemplateConfig {
  page: {
    size: 'A4'
    marginPt: number
    /** Data URI, resized to A4 on upload; used as the background for every page except the cover. Omitted when there's no background image. */
    backgroundImage?: string
  }
  typography: {
    fontFamily: string
    baseFontSize: number
    titleFontSize: number
    headingFontSize: number
  }
  colors: {
    text: string
    muted: string
    tableHeaderBackground: string
    borderColor: string
  }
  cover: {
    showCreationLocationDate: boolean
    showSlogan: boolean
    /** Data URI or bundled asset path; omitted when the cover has no background image. */
    backgroundImage?: string
  }
  header: {
    showEstimateNumberAndDate: boolean
  }
  footer: {
    showPageNumbers: boolean
    showCompanyInfo: boolean
  }
  table: {
    columns: TableColumnConfig[]
    showBorders: boolean
    /** Whether the "Chapter subtotal: ..." line is printed after each chapter's line items. */
    showChapterSubtotal: boolean
  }
  finalPage: {
    totalLabel: string
    signatureLabel: string
    /** Default title/content for the final-page note, snapshotted onto new estimates that use this template. */
    noteTitle: string
    noteContent: string
  }
}

/** A saved, reusable template record (persistence + identity on top of TemplateConfig). */
export interface Template extends TemplateConfig {
  id: string
  name: string
  /** At most one template should be the default at a time. */
  isDefault: boolean
}

export interface UserProfile {
  id: string
  name: string
  address: string
  postalCode: string
  phone: string
  email: string
  slogan: string
}

export interface StandardText {
  id: string
  key: string // Unique identifier for the text block
  title: string
  content: string // Can be multi-line
}
