const STORAGE_KEY = 'budgetapp.appSettings'

/** Application-wide preferences (SPECS.md §3 Settings) beyond appearance,
 * which is handled separately in src/theme.ts since it must be readable
 * synchronously before first paint. */
export interface AppSettings {
  /** Applied to new estimates when they're created (SPECS.md §4 Estimate.taxRate). */
  defaultTaxRate: number
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultTaxRate: 0,
}

const read = (): AppSettings => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return DEFAULT_SETTINGS
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const write = (settings: AppSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const appSettingsRepositoryClient = {
  get: async (): Promise<AppSettings> => read(),

  update: async (settings: AppSettings): Promise<AppSettings> => {
    write(settings)
    return settings
  },
}
