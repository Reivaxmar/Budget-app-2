import { supabase } from '../lib/supabaseClient'

/**
 * Every repository client (customers, chapters, line items, items, item
 * categories, templates, ...) previously followed the exact same
 * create/findById/findMany/update/delete shape over a single localStorage
 * array. This factory keeps that shape over a Supabase Postgres table
 * instead, scoped to the signed-in user (see supabase/schema.sql RLS
 * policies — `user_id = auth.uid()` is enforced server-side, this is just
 * where `user_id` gets set on insert).
 *
 * `toRow`/`fromRow` translate between the domain shape (camelCase, as used
 * throughout the app) and the Postgres row shape (snake_case columns) for
 * one table.
 */
export function createSupabaseCrudRepository<TDomain extends { id: string }, TRow extends { id: string }>(
  table: string,
  toRow: (domain: Partial<Omit<TDomain, 'id'>>) => Record<string, unknown>,
  fromRow: (row: TRow) => TDomain
) {
  const currentUserId = async (): Promise<string> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not signed in.')
    }
    return user.id
  }

  // Supabase's PostgrestError carries a Postgres error code/details/hint
  // (e.g. "42703 column ... does not exist") that `error.message` alone
  // drops — logging the full error here, at the one place every
  // create/update funnels through, is what actually pinpoints *why* a save
  // failed instead of just that it did.
  const logAndThrow = (op: string, error: { message: string; code?: string; details?: string | null; hint?: string | null }, payload?: unknown): never => {
    console.error(`Supabase ${op} failed on "${table}":`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
    })
    throw new Error(error.message)
  }

  return {
    create: async (domain: Omit<TDomain, 'id'>): Promise<TDomain> => {
      const userId = await currentUserId()
      const row = { ...toRow(domain), user_id: userId }
      const { data, error } = await supabase.from(table).insert(row).select().single()
      if (error) logAndThrow('insert', error, row)
      return fromRow(data as TRow)
    },

    findById: async (id: string): Promise<TDomain | null> => {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
      if (error) logAndThrow('select', error, { id })
      return data ? fromRow(data as TRow) : null
    },

    findMany: async (): Promise<TDomain[]> => {
      const { data, error } = await supabase.from(table).select('*')
      if (error) logAndThrow('select', error)
      return (data as TRow[]).map(fromRow)
    },

    update: async (id: string, domain: Partial<Omit<TDomain, 'id'>>): Promise<TDomain> => {
      const row = toRow(domain)
      const { data, error } = await supabase.from(table).update(row).eq('id', id).select().single()
      if (error) logAndThrow('update', error, { id, row })
      return fromRow(data as TRow)
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) logAndThrow('delete', error, { id })
    },
  }
}
