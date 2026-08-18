import type { StandardText, UserProfile } from '../domain/models'

const STORAGE_KEY = 'budgetapp.companyProfile'

/**
 * The identity and document defaults used when generating PDFs: the
 * company/user profile (SPECS.md §4 UserProfile) shown in the cover/footer,
 * the location shown next to the creation date, and the standard note shown
 * on the final page (SPECS.md §4 StandardText).
 */
export interface CompanyProfileSettings {
  profile: UserProfile
  creationLocation: string
  standardNote: StandardText
}

const DEFAULT_SETTINGS: CompanyProfileSettings = {
  profile: {
    id: 'company-profile',
    name: '',
    address: '',
    postalCode: '',
    phone: '',
    email: '',
    slogan: '',
  },
  creationLocation: '',
  standardNote: {
    id: 'standard-note-default',
    key: 'estimate-final-note',
    title: 'Condiciones del presupuesto',
    content: '',
  },
}

const read = (): CompanyProfileSettings => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return DEFAULT_SETTINGS
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CompanyProfileSettings>
    return {
      profile: { ...DEFAULT_SETTINGS.profile, ...parsed.profile },
      creationLocation: parsed.creationLocation ?? DEFAULT_SETTINGS.creationLocation,
      standardNote: { ...DEFAULT_SETTINGS.standardNote, ...parsed.standardNote },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const write = (settings: CompanyProfileSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const companyProfileRepositoryClient = {
  get: async (): Promise<CompanyProfileSettings> => read(),

  update: async (settings: CompanyProfileSettings): Promise<CompanyProfileSettings> => {
    write(settings)
    return settings
  },
}
