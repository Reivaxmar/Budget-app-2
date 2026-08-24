import type { Template, TemplateConfig } from '../domain/models'
import { supabase } from '../lib/supabaseClient'

interface TemplateRow {
  id: string
  name: string
  is_default: boolean
  config: TemplateConfig
}

const fromRow = (row: TemplateRow): Template => ({
  id: row.id,
  name: row.name,
  isDefault: row.is_default,
  ...row.config,
})

const currentUserId = async (): Promise<string> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not signed in.')
  }
  return user.id
}

// TemplateConfig (page/typography/colors/cover/header/footer/table/finalPage)
// is stored as a single `config` jsonb column rather than one column per
// field. A Postgres jsonb column update replaces the whole value — it does
// not deep-merge — so a *partial* domain update (e.g. renaming a template,
// or `handleSaveTemplateOverride` writing just the changed template form
// fields) must read the current config and merge client-side before
// writing, or it would silently drop every config field not included in
// this particular update.
async function mergedConfig(id: string, patch: Partial<Omit<Template, 'id'>>): Promise<TemplateConfig | undefined> {
  const { name, isDefault, ...configPatch } = patch
  if (Object.keys(configPatch).length === 0) return undefined

  const { data, error } = await supabase.from('templates').select('config').eq('id', id).single()
  if (error) throw new Error(error.message)
  return { ...(data as { config: TemplateConfig }).config, ...configPatch }
}

export const templateRepositoryClient = {
  create: async (template: Omit<Template, 'id'>): Promise<Template> => {
    const userId = await currentUserId()
    const { name, isDefault, ...config } = template
    const { data, error } = await supabase
      .from('templates')
      .insert({ user_id: userId, name, is_default: isDefault, config })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return fromRow(data as TemplateRow)
  },

  findById: async (id: string): Promise<Template | null> => {
    const { data, error } = await supabase.from('templates').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? fromRow(data as TemplateRow) : null
  },

  findMany: async (): Promise<Template[]> => {
    const { data, error } = await supabase.from('templates').select('*')
    if (error) throw new Error(error.message)
    return (data as TemplateRow[]).map(fromRow)
  },

  update: async (id: string, template: Partial<Omit<Template, 'id'>>): Promise<Template> => {
    const config = await mergedConfig(id, template)
    const row: Record<string, unknown> = {}
    if (template.name !== undefined) row.name = template.name
    if (template.isDefault !== undefined) row.is_default = template.isDefault
    if (config !== undefined) row.config = config

    const { data, error } = await supabase.from('templates').update(row).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return fromRow(data as TemplateRow)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('templates').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
