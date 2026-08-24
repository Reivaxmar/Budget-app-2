import type { Estimate, Chapter, LineItem, TemplateConfig } from '../domain/models'
import { supabase } from '../lib/supabaseClient'
import { createSupabaseCrudRepository } from './supabaseCrudRepository'

interface EstimateRow {
  id: string
  estimate_number: string
  year: number
  customer_id: string
  subject: string
  site: string
  creation_date: string
  status: string
  tax_rate: number
  introduction: string
  template_id: string
  final_note_title: string
  final_note_content: string
  template_overrides: TemplateConfig | null
  updated_at: string
}

const estimateToRow = (estimate: Partial<Omit<Estimate, 'id'>>): Record<string, unknown> => ({
  ...(estimate.estimateNumber !== undefined && { estimate_number: estimate.estimateNumber }),
  ...(estimate.year !== undefined && { year: estimate.year }),
  ...(estimate.customerId !== undefined && { customer_id: estimate.customerId }),
  ...(estimate.subject !== undefined && { subject: estimate.subject }),
  ...(estimate.site !== undefined && { site: estimate.site }),
  ...(estimate.creationDate !== undefined && { creation_date: estimate.creationDate }),
  ...(estimate.status !== undefined && { status: estimate.status }),
  ...(estimate.taxRate !== undefined && { tax_rate: estimate.taxRate }),
  ...(estimate.introduction !== undefined && { introduction: estimate.introduction }),
  ...(estimate.templateId !== undefined && { template_id: estimate.templateId }),
  ...(estimate.finalNoteTitle !== undefined && { final_note_title: estimate.finalNoteTitle }),
  ...(estimate.finalNoteContent !== undefined && { final_note_content: estimate.finalNoteContent }),
  ...(estimate.templateOverrides !== undefined && { template_overrides: estimate.templateOverrides }),
  ...(estimate.updatedAt !== undefined && { updated_at: estimate.updatedAt }),
})

const estimateFromRow = (row: EstimateRow): Estimate => ({
  id: row.id,
  estimateNumber: row.estimate_number,
  year: row.year,
  customerId: row.customer_id,
  subject: row.subject,
  site: row.site,
  creationDate: row.creation_date,
  status: row.status,
  taxRate: row.tax_rate,
  introduction: row.introduction,
  templateId: row.template_id,
  finalNoteTitle: row.final_note_title,
  finalNoteContent: row.final_note_content,
  templateOverrides: row.template_overrides,
  updatedAt: row.updated_at,
})

export const estimateRepositoryClient = createSupabaseCrudRepository<Estimate, EstimateRow>(
  'estimates',
  estimateToRow,
  estimateFromRow
)

interface ChapterRow {
  id: string
  estimate_id: string
  title: string
  order: number
}

const chapterToRow = (chapter: Partial<Omit<Chapter, 'id'>>): Record<string, unknown> => ({
  ...(chapter.estimateId !== undefined && { estimate_id: chapter.estimateId }),
  ...(chapter.title !== undefined && { title: chapter.title }),
  ...(chapter.order !== undefined && { order: chapter.order }),
})

const chapterFromRow = (row: ChapterRow): Chapter => ({
  id: row.id,
  estimateId: row.estimate_id,
  title: row.title,
  order: row.order,
})

const baseChapterRepository = createSupabaseCrudRepository<Chapter, ChapterRow>(
  'chapters',
  chapterToRow,
  chapterFromRow
)

export const chapterRepositoryClient = {
  ...baseChapterRepository,
  findByEstimateId: async (estimateId: string): Promise<Chapter[]> => {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('estimate_id', estimateId)
      .order('order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data as ChapterRow[]).map(chapterFromRow)
  },
}

interface LineItemRow {
  id: string
  chapter_id: string
  code: string
  description: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
  order: number
}

const lineItemToRow = (lineItem: Partial<Omit<LineItem, 'id'>>): Record<string, unknown> => ({
  ...(lineItem.chapterId !== undefined && { chapter_id: lineItem.chapterId }),
  ...(lineItem.code !== undefined && { code: lineItem.code }),
  ...(lineItem.description !== undefined && { description: lineItem.description }),
  ...(lineItem.unit !== undefined && { unit: lineItem.unit }),
  ...(lineItem.quantity !== undefined && { quantity: lineItem.quantity }),
  ...(lineItem.unitPrice !== undefined && { unit_price: lineItem.unitPrice }),
  ...(lineItem.amount !== undefined && { amount: lineItem.amount }),
  ...(lineItem.order !== undefined && { order: lineItem.order }),
})

const lineItemFromRow = (row: LineItemRow): LineItem => ({
  id: row.id,
  chapterId: row.chapter_id,
  code: row.code,
  description: row.description,
  unit: row.unit,
  quantity: row.quantity,
  unitPrice: row.unit_price,
  amount: row.amount,
  order: row.order,
})

const baseLineItemRepository = createSupabaseCrudRepository<LineItem, LineItemRow>(
  'line_items',
  lineItemToRow,
  lineItemFromRow
)

export const lineItemRepositoryClient = {
  ...baseLineItemRepository,
  findByChapterId: async (chapterId: string): Promise<LineItem[]> => {
    const { data, error } = await supabase
      .from('line_items')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('order', { ascending: true })
    if (error) throw new Error(error.message)
    return (data as LineItemRow[]).map(lineItemFromRow)
  },
}
