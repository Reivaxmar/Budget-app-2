// Vitest setup file
// You can add custom matchers or global setup here if needed

// Initializes i18next once for the whole test run, same as main.tsx does
// for the real app — without this, components render raw translation
// keys ("customers.title") instead of the English text tests assert on.
import '../i18n'

import { vi, beforeEach } from 'vitest'

// Every repository client now talks to Supabase instead of localStorage —
// this mock swaps in the in-memory fake (fakeSupabaseClient.ts) for every
// test file by default, so existing business-logic tests keep working
// without a real network/Supabase project. Individual test files can still
// vi.mock('../lib/supabaseClient', ...) themselves for finer control (see
// the repository client tests), which simply overrides this default within
// that file.
vi.mock('../lib/supabaseClient', async () => {
  const { createFakeSupabaseClient } = await import('./fakeSupabaseClient')
  return { supabase: createFakeSupabaseClient(), isSupabaseConfigured: true }
})

import { supabase } from '../lib/supabaseClient'

beforeEach(() => {
  ;(supabase as unknown as { __reset: () => void }).__reset()
})
