import type { Estimate, Chapter, LineItem } from '../domain/models'

const ESTIMATES_KEY = 'budgetapp.estimates'
const CHAPTERS_KEY = 'budgetapp.chapters'
const LINE_ITEMS_KEY = 'budgetapp.lineItems'

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readAll<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export const estimateRepositoryClient = {
  create: async (estimate: Omit<Estimate, 'id'>): Promise<Estimate> => {
    const newEstimate: Estimate = { ...estimate, id: createId() }
    const estimates = readAll<Estimate>(ESTIMATES_KEY)
    estimates.push(newEstimate)
    writeAll(ESTIMATES_KEY, estimates)
    return newEstimate
  },

  findById: async (id: string): Promise<Estimate | null> => {
    const estimates = readAll<Estimate>(ESTIMATES_KEY)
    return estimates.find((estimate) => estimate.id === id) ?? null
  },

  findMany: async (): Promise<Estimate[]> => {
    return readAll<Estimate>(ESTIMATES_KEY)
  },

  update: async (
    id: string,
    estimate: Partial<Omit<Estimate, 'id'>>,
  ): Promise<Estimate> => {
    const estimates = readAll<Estimate>(ESTIMATES_KEY)
    const index = estimates.findIndex((item) => item.id === id)

    if (index < 0) {
      throw new Error(`Estimate ${id} not found`)
    }

    const updated: Estimate = { ...estimates[index], ...estimate, id }
    estimates[index] = updated
    writeAll(ESTIMATES_KEY, estimates)
    return updated
  },

  delete: async (id: string): Promise<void> => {
    const estimates = readAll<Estimate>(ESTIMATES_KEY).filter((estimate) => estimate.id !== id)
    writeAll(ESTIMATES_KEY, estimates)
  },
}

export const chapterRepositoryClient = {
  create: async (chapter: Omit<Chapter, 'id'>): Promise<Chapter> => {
    const newChapter: Chapter = { ...chapter, id: createId() }
    const chapters = readAll<Chapter>(CHAPTERS_KEY)
    chapters.push(newChapter)
    writeAll(CHAPTERS_KEY, chapters)
    return newChapter
  },

  findById: async (id: string): Promise<Chapter | null> => {
    const chapters = readAll<Chapter>(CHAPTERS_KEY)
    return chapters.find((chapter) => chapter.id === id) ?? null
  },

  findMany: async (): Promise<Chapter[]> => {
    return readAll<Chapter>(CHAPTERS_KEY)
  },

  findByEstimateId: async (estimateId: string): Promise<Chapter[]> => {
    return readAll<Chapter>(CHAPTERS_KEY)
      .filter((chapter) => chapter.estimateId === estimateId)
      .sort((a, b) => a.order - b.order)
  },

  update: async (
    id: string,
    chapter: Partial<Omit<Chapter, 'id'>>,
  ): Promise<Chapter> => {
    const chapters = readAll<Chapter>(CHAPTERS_KEY)
    const index = chapters.findIndex((item) => item.id === id)

    if (index < 0) {
      throw new Error(`Chapter ${id} not found`)
    }

    const updated: Chapter = { ...chapters[index], ...chapter, id }
    chapters[index] = updated
    writeAll(CHAPTERS_KEY, chapters)
    return updated
  },

  delete: async (id: string): Promise<void> => {
    const chapters = readAll<Chapter>(CHAPTERS_KEY).filter((chapter) => chapter.id !== id)
    writeAll(CHAPTERS_KEY, chapters)
  },
}

export const lineItemRepositoryClient = {
  create: async (lineItem: Omit<LineItem, 'id'>): Promise<LineItem> => {
    const newLineItem: LineItem = { ...lineItem, id: createId() }
    const lineItems = readAll<LineItem>(LINE_ITEMS_KEY)
    lineItems.push(newLineItem)
    writeAll(LINE_ITEMS_KEY, lineItems)
    return newLineItem
  },

  findById: async (id: string): Promise<LineItem | null> => {
    const lineItems = readAll<LineItem>(LINE_ITEMS_KEY)
    return lineItems.find((lineItem) => lineItem.id === id) ?? null
  },

  findMany: async (): Promise<LineItem[]> => {
    return readAll<LineItem>(LINE_ITEMS_KEY)
  },

  findByChapterId: async (chapterId: string): Promise<LineItem[]> => {
    return readAll<LineItem>(LINE_ITEMS_KEY)
      .filter((lineItem) => lineItem.chapterId === chapterId)
      .sort((a, b) => a.order - b.order)
  },

  update: async (
    id: string,
    lineItem: Partial<Omit<LineItem, 'id'>>,
  ): Promise<LineItem> => {
    const lineItems = readAll<LineItem>(LINE_ITEMS_KEY)
    const index = lineItems.findIndex((item) => item.id === id)

    if (index < 0) {
      throw new Error(`LineItem ${id} not found`)
    }

    const updated: LineItem = { ...lineItems[index], ...lineItem, id }
    lineItems[index] = updated
    writeAll(LINE_ITEMS_KEY, lineItems)
    return updated
  },

  delete: async (id: string): Promise<void> => {
    const lineItems = readAll<LineItem>(LINE_ITEMS_KEY).filter((lineItem) => lineItem.id !== id)
    writeAll(LINE_ITEMS_KEY, lineItems)
  },
}
