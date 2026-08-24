import type { ItemCategory } from '../domain/models'
import { createSupabaseCrudRepository } from './supabaseCrudRepository'

interface ItemCategoryRow {
  id: string
  name: string
  order: number
}

const toRow = (category: Partial<Omit<ItemCategory, 'id'>>): Record<string, unknown> => ({
  ...(category.name !== undefined && { name: category.name }),
  ...(category.order !== undefined && { order: category.order }),
})

const fromRow = (row: ItemCategoryRow): ItemCategory => ({
  id: row.id,
  name: row.name,
  order: row.order,
})

export const itemCategoryRepositoryClient = createSupabaseCrudRepository<ItemCategory, ItemCategoryRow>(
  'item_categories',
  toRow,
  fromRow
)
