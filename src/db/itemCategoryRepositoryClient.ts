import type { ItemCategory } from '../domain/models'

const STORAGE_KEY = 'budgetapp.itemCategories'

const readCategories = (): ItemCategory[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as ItemCategory[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

const writeCategories = (categories: ItemCategory[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
}

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const itemCategoryRepositoryClient = {
  create: async (category: Omit<ItemCategory, 'id'>): Promise<ItemCategory> => {
    const newCategory: ItemCategory = { ...category, id: createId() }
    const categories = readCategories()
    categories.push(newCategory)
    writeCategories(categories)
    return newCategory
  },

  findById: async (id: string): Promise<ItemCategory | null> => {
    const categories = readCategories()
    return categories.find((category) => category.id === id) ?? null
  },

  findMany: async (): Promise<ItemCategory[]> => {
    return readCategories()
  },

  update: async (
    id: string,
    category: Partial<Omit<ItemCategory, 'id'>>,
  ): Promise<ItemCategory> => {
    const categories = readCategories()
    const index = categories.findIndex((existing) => existing.id === id)

    if (index < 0) {
      throw new Error(`Item category ${id} not found`)
    }

    const updatedCategory: ItemCategory = {
      ...categories[index],
      ...category,
      id,
    }

    categories[index] = updatedCategory
    writeCategories(categories)
    return updatedCategory
  },

  delete: async (id: string): Promise<void> => {
    const categories = readCategories().filter((category) => category.id !== id)
    writeCategories(categories)
  },
}
