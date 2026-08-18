import type { Template } from '../domain/models'

const STORAGE_KEY = 'budgetapp.templates'

const readTemplates = (): Template[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Template[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

const writeTemplates = (templates: Template[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const templateRepositoryClient = {
  create: async (template: Omit<Template, 'id'>): Promise<Template> => {
    const newTemplate: Template = { ...template, id: createId() }
    const templates = readTemplates()
    templates.push(newTemplate)
    writeTemplates(templates)
    return newTemplate
  },

  findById: async (id: string): Promise<Template | null> => {
    const templates = readTemplates()
    return templates.find((template) => template.id === id) ?? null
  },

  findMany: async (): Promise<Template[]> => {
    return readTemplates()
  },

  update: async (
    id: string,
    template: Partial<Omit<Template, 'id'>>,
  ): Promise<Template> => {
    const templates = readTemplates()
    const index = templates.findIndex((existing) => existing.id === id)

    if (index < 0) {
      throw new Error(`Template ${id} not found`)
    }

    const updatedTemplate: Template = {
      ...templates[index],
      ...template,
      id,
    }

    templates[index] = updatedTemplate
    writeTemplates(templates)
    return updatedTemplate
  },

  delete: async (id: string): Promise<void> => {
    const templates = readTemplates().filter((template) => template.id !== id)
    writeTemplates(templates)
  },
}
