import type { Item } from '../domain/models'
import { createSupabaseCrudRepository } from './supabaseCrudRepository'

interface ItemRow {
  id: string
  code: string
  description: string
  unit: string
  default_price: number
  category_id: string
  keywords: string
}

const toRow = (item: Partial<Omit<Item, 'id'>>): Record<string, unknown> => ({
  ...(item.code !== undefined && { code: item.code }),
  ...(item.description !== undefined && { description: item.description }),
  ...(item.unit !== undefined && { unit: item.unit }),
  ...(item.defaultPrice !== undefined && { default_price: item.defaultPrice }),
  ...(item.categoryId !== undefined && { category_id: item.categoryId }),
  ...(item.keywords !== undefined && { keywords: item.keywords }),
})

const fromRow = (row: ItemRow): Item => ({
  id: row.id,
  code: row.code,
  description: row.description,
  unit: row.unit,
  defaultPrice: row.default_price,
  categoryId: row.category_id,
  keywords: row.keywords,
})

export const itemRepositoryClient = createSupabaseCrudRepository<Item, ItemRow>('items', toRow, fromRow)
