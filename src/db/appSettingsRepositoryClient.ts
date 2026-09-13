import { supabase } from '../lib/supabaseClient'

/** Application-wide preferences (SPECS.md §3 Settings) beyond appearance,
 * which is handled separately in src/theme.ts since it must be readable
 * synchronously before first paint. */
export interface AppSettings {
  /** Applied to new estimates when they're created (SPECS.md §4 Estimate.taxRate). */
  defaultTaxRate: number
  /** The sequence number that will be assigned to the next estimate created
   * (see estimateService.generateEstimateNumber). User-editable so an
   * estimate series can be started at an arbitrary number (e.g. to
   * continue numbering from a previous system); auto-incremented by one
   * every time an estimate is created, and never reset by year. */
  nextEstimateNumber: number
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultTaxRate: 0,
  nextEstimateNumber: 1,
}

interface AppSettingsRow {
  user_id: string
  default_tax_rate: number
  next_estimate_number: number
}

const currentUserId = async (): Promise<string> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not signed in.')
  }
  return user.id
}

export const appSettingsRepositoryClient = {
  // One row per user, keyed by user_id — see companyProfileRepositoryClient
  // for the same read/upsert pattern.
  get: async (): Promise<AppSettings> => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('Supabase select failed on "app_settings":', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(error.message)
    }
    if (!data) return DEFAULT_SETTINGS

    const row = data as AppSettingsRow
    return {
      defaultTaxRate: row.default_tax_rate ?? DEFAULT_SETTINGS.defaultTaxRate,
      nextEstimateNumber: row.next_estimate_number ?? DEFAULT_SETTINGS.nextEstimateNumber,
    }
  },

  update: async (settings: AppSettings): Promise<AppSettings> => {
    const userId = await currentUserId()
    const row = {
      user_id: userId,
      default_tax_rate: settings.defaultTaxRate,
      next_estimate_number: settings.nextEstimateNumber,
    }
    const { error } = await supabase.from('app_settings').upsert(row)
    if (error) {
      console.error('Supabase upsert failed on "app_settings":', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload: row,
      })
      throw new Error(error.message)
    }
    return settings
  },
}
