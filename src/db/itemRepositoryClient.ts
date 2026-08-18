import type { Item } from '../domain/models'

const STORAGE_KEY = 'budgetapp.items'

const readItems = (): Item[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Item[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

const writeItems = (items: Item[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const itemRepositoryClient = {
  create: async (item: Omit<Item, 'id'>): Promise<Item> => {
    const newItem: Item = { ...item, id: createId() }
    const items = readItems()
    items.push(newItem)
    writeItems(items)
    return newItem
  },

  findById: async (id: string): Promise<Item | null> => {
    const items = readItems()
    return items.find((item) => item.id === id) ?? null
  },

  findMany: async (): Promise<Item[]> => {
    return readItems()
  },

  update: async (
    id: string,
    item: Partial<Omit<Item, 'id'>>,
  ): Promise<Item> => {
    const items = readItems()
    const index = items.findIndex((existing) => existing.id === id)

    if (index < 0) {
      throw new Error(`Item ${id} not found`)
    }

    const updatedItem: Item = {
      ...items[index],
      ...item,
      id,
    }

    items[index] = updatedItem
    writeItems(items)
    return updatedItem
  },

  delete: async (id: string): Promise<void> => {
    const items = readItems().filter((item) => item.id !== id)
    writeItems(items)
  },
}
