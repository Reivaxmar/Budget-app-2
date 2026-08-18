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
  code: string // Internal code for the catalog entry
  description: string // Default description used when inserted into an estimate
  unit: string // Default unit, e.g. 'm²', 'pcs', 'h'
  defaultPrice: number // Default unit price
  category: string // Optional grouping/category, empty string if none
  keywords: string // Optional search keywords, empty string if none
}

export interface Template {
  id: string
  name: string
  cover: {
    backgroundImage?: string // URL or path
    showCreationLocationDate?: boolean
    showSlogan?: boolean
    // Additional cover properties can be added here
  }
  header: {
    showEstimateNumberAndDate?: boolean
    // Additional header properties
  }
  footer: {
    showPageNumbers?: boolean
    showCompanyInfo?: boolean
    // Additional footer properties
  }
  typography: {
    fontFamily?: string
    fontSizeTitle?: string
    fontSizeHeading?: string
    fontSizeBody?: string
    // Additional typography properties
  }
  spacing: {
    paragraphBefore?: number // in pt or px
    paragraphAfter?: number
    lineHeight?: number
    // Additional spacing properties
  }
  tableRules: {
    showBorders?: boolean
    borderWidth?: number
    // Additional table properties
  }
  // Note: This is a simplified template model. In practice, this would be more complex.
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
