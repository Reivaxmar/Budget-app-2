import { createClient } from '@supabase/supabase-js'

// Both are safe to expose in a shipped client build: the anon key only
// grants what Row Level Security policies allow (see supabase/schema.sql),
// never a service-role bypass. They must still be provided at build time
// (see DIST.md "Supabase setup") since Vite inlines import.meta.env.VITE_*
// values into the bundle — there is no runtime config file to edit later.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True once both required Supabase env vars were provided at build time. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// A stub URL/key when unconfigured lets createClient() succeed at module
// load time (no top-level throw that would blank-screen the whole app);
// every real call fails, but the app can still render the "not configured"
// notice in AuthProvider instead of a white screen.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
