import type { UserProfile } from '../domain/models'
import { supabase } from '../lib/supabaseClient'

/**
 * The identity and document defaults used when generating PDFs: the
 * company/user profile (SPECS.md §4 UserProfile) shown in the cover/footer,
 * and the location shown next to the creation date. The final-page note is
 * owned by the Template (and snapshotted per-estimate) instead, since it's
 * presentation, not company identity — see Template.finalPage and
 * Estimate.finalNoteTitle/finalNoteContent.
 */
export interface CompanyProfileSettings {
  profile: UserProfile
  creationLocation: string
}

const DEFAULT_SETTINGS: CompanyProfileSettings = {
  profile: {
    id: 'company-profile',
    name: '',
    address: '',
    postalCode: '',
    phone: '',
    email: '',
    taxId: '',
    slogan: '',
  },
  creationLocation: '',
}

interface CompanyProfileRow {
  user_id: string
  profile: UserProfile
  creation_location: string
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

export const companyProfileRepositoryClient = {
  // One row per user, keyed by user_id — there is exactly one company
  // profile per account, so this reads/upserts rather than exposing
  // create/findById/delete like the array-backed repositories.
  get: async (): Promise<CompanyProfileSettings> => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('company_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('Supabase select failed on "company_profile":', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(error.message)
    }
    if (!data) return DEFAULT_SETTINGS

    const row = data as CompanyProfileRow
    return {
      profile: { ...DEFAULT_SETTINGS.profile, ...row.profile },
      creationLocation: row.creation_location ?? DEFAULT_SETTINGS.creationLocation,
    }
  },

  update: async (settings: CompanyProfileSettings): Promise<CompanyProfileSettings> => {
    const userId = await currentUserId()
    const row = {
      user_id: userId,
      profile: settings.profile,
      creation_location: settings.creationLocation,
    }
    const { error } = await supabase.from('company_profile').upsert(row)
    if (error) {
      console.error('Supabase upsert failed on "company_profile":', {
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
