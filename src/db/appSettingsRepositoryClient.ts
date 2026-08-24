import { supabase } from '../lib/supabaseClient'

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

interface AppSettingsRow {
  user_id: string
  default_tax_rate: number
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
    if (error) throw new Error(error.message)
    if (!data) return DEFAULT_SETTINGS

    const row = data as AppSettingsRow
    return { defaultTaxRate: row.default_tax_rate ?? DEFAULT_SETTINGS.defaultTaxRate }
  },

  update: async (settings: AppSettings): Promise<AppSettings> => {
    const userId = await currentUserId()
    const { error } = await supabase
      .from('app_settings')
      .upsert({ user_id: userId, default_tax_rate: settings.defaultTaxRate })
    if (error) throw new Error(error.message)
    return settings
  },
}
