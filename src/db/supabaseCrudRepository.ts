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

  return {
    create: async (domain: Omit<TDomain, 'id'>): Promise<TDomain> => {
      const userId = await currentUserId()
      const { data, error } = await supabase
        .from(table)
        .insert({ ...toRow(domain), user_id: userId })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return fromRow(data as TRow)
    },

    findById: async (id: string): Promise<TDomain | null> => {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(error.message)
      return data ? fromRow(data as TRow) : null
    },

    findMany: async (): Promise<TDomain[]> => {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw new Error(error.message)
      return (data as TRow[]).map(fromRow)
    },

    update: async (id: string, domain: Partial<Omit<TDomain, 'id'>>): Promise<TDomain> => {
      const { data, error } = await supabase
        .from(table)
        .update(toRow(domain))
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return fromRow(data as TRow)
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
  }
}
