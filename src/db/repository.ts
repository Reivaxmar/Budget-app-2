import { db } from './db'
import {
  customers,
  estimates,
  chapters,
  lineItems,
  templates,
  userProfiles,
  standardTexts,
} from './schema'
import type { Customer } from '../domain/models'
import type { Estimate } from '../domain/models'
import type { Chapter } from '../domain/models'
import type { LineItem } from '../domain/models'
import type { Template } from '../domain/models'
import type { UserProfile } from '../domain/models'
import type { StandardText } from '../domain/models'
import { eq, asc } from 'drizzle-orm'
// Use browser crypto API for randomUUID in Tauri frontend
const randomUUID = () => {
  // @ts-ignore: crypto is available on window in browser/Tauri
  if (typeof crypto !== 'undefined') {
    return crypto.randomUUID()
  }
  // Fallback for Node.js (if ever used)
  // @ts-ignore: require is available in Node.js
  const { randomUUID: nodeRandomUUID } = require('crypto')
  return nodeRandomUUID()
}

// Helper to convert nullable fields to empty string for domain model
const toDomainString = (value: string | null): string => value ?? ''

// Customer repository
export const customerRepository = {
  create: async (customer: Omit<Customer, 'id'>) => {
    const id = randomUUID()
    const [result] = await db
      .insert(customers)
      .values({
        id,
        name: customer.name,
        address: customer.address,
        phone: customer.phone === '' ? null : customer.phone,
        email: customer.email,
        taxId: customer.taxId === '' ? null : customer.taxId,
        notes: customer.notes === '' ? null : customer.notes,
      })
      .returning()

    return {
      id: result.id,
      name: result.name,
      address: result.address,
      phone: toDomainString(result.phone),
      email: toDomainString(result.email),
      taxId: toDomainString(result.taxId),
      notes: toDomainString(result.notes),
    } as Customer
  },

  findById: async (id: string) => {
    const result = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .get()
    if (!result) return null

    return {
      id: result.id,
      name: result.name,
      address: result.address,
      phone: toDomainString(result.phone),
      email: toDomainString(result.email),
      taxId: toDomainString(result.taxId),
      notes: toDomainString(result.notes),
    } as Customer
  },

  findMany: async () => {
    const results = await db.select().from(customers).all()
    return results.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      phone: toDomainString(r.phone),
      email: toDomainString(r.email),
      taxId: toDomainString(r.taxId),
      notes: toDomainString(r.notes),
    })) as Customer[]
  },

  update: async (id: string, customer: Partial<Omit<Customer, 'id'>>) => {
    const [result] = await db
      .update(customers)
      .set({
        name: customer.name,
        address: customer.address,
        phone: customer.phone === '' ? null : customer.phone,
        email: customer.email,
        taxId: customer.taxId === '' ? null : customer.taxId,
        notes: customer.notes === '' ? null : customer.notes,
      })
      .where(eq(customers.id, id))
      .returning()

    return {
      id: result.id,
      name: result.name,
      address: result.address,
      phone: toDomainString(result.phone),
      email: toDomainString(result.email),
      taxId: toDomainString(result.taxId),
      notes: toDomainString(result.notes),
    } as Customer
  },

  delete: async (id: string) => {
    await db.delete(customers).where(eq(customers.id, id))
  },
}

// Estimate repository
export const estimateRepository = {
  create: async (estimate: Omit<Estimate, 'id'>) => {
    const id = randomUUID()
    const [result] = await db
      .insert(estimates)
      .values({
        id,
        estimateNumber: estimate.estimateNumber,
        year: estimate.year,
        customerId: estimate.customerId,
        subject: estimate.subject,
        site: estimate.site,
        creationDate: estimate.creationDate,
        status: estimate.status,
        taxRate: estimate.taxRate,
      })
      .returning()

    return result as Estimate
  },

  findById: async (id: string) => {
    const result = await db
      .select()
      .from(estimates)
      .where(eq(estimates.id, id))
      .get()
    return result ?? null
  },

  findMany: async () => {
    return await db.select().from(estimates).all()
  },

  update: async (id: string, estimate: Partial<Omit<Estimate, 'id'>>) => {
    const [result] = await db
      .update(estimates)
      .set({
        estimateNumber: estimate.estimateNumber,
        year: estimate.year,
        customerId: estimate.customerId,
        subject: estimate.subject,
        site: estimate.site,
        creationDate: estimate.creationDate,
        status: estimate.status,
        taxRate: estimate.taxRate,
      })
      .where(eq(estimates.id, id))
      .returning()

    return result as Estimate
  },

  delete: async (id: string) => {
    await db.delete(estimates).where(eq(estimates.id, id))
  },
}

// Chapter repository
export const chapterRepository = {
  create: async (chapter: Omit<Chapter, 'id'>) => {
    const id = randomUUID()
    const [result] = await db
      .insert(chapters)
      .values({
        id,
        estimateId: chapter.estimateId,
        title: chapter.title,
        order: chapter.order,
      })
      .returning()

    return result as Chapter
  },

  findById: async (id: string) => {
    const result = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, id))
      .get()
    return result ?? null
  },

  findMany: async () => {
    return await db.select().from(chapters).all()
  },

  findByEstimateId: async (estimateId: string) => {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.estimateId, estimateId))
      .orderBy((chapters) => [asc(chapters.order)])
      .all()
  },

  update: async (id: string, chapter: Partial<Omit<Chapter, 'id'>>) => {
    const [result] = await db
      .update(chapters)
      .set({
        estimateId: chapter.estimateId,
        title: chapter.title,
        order: chapter.order,
      })
      .where(eq(chapters.id, id))
      .returning()

    return result as Chapter
  },

  delete: async (id: string) => {
    await db.delete(chapters).where(eq(chapters.id, id))
  },
}

// LineItem repository
export const lineItemRepository = {
  create: async (lineItem: Omit<LineItem, 'id'>) => {
    const id = randomUUID()
    const [result] = await db
      .insert(lineItems)
      .values({
        id,
        chapterId: lineItem.chapterId,
        code: lineItem.code,
        description: lineItem.description,
        unit: lineItem.unit,
        quantity: lineItem.quantity,
        unitPrice: lineItem.unitPrice,
        amount: lineItem.amount,
        order: lineItem.order,
      })
      .returning()

    return result as LineItem
  },

  findById: async (id: string) => {
    const result = await db
      .select()
      .from(lineItems)
      .where(eq(lineItems.id, id))
      .get()
    return result ?? null
  },

  findMany: async () => {
    return await db.select().from(lineItems).all()
  },

  findByChapterId: async (chapterId: string) => {
    return await db
      .select()
      .from(lineItems)
      .where(eq(lineItems.chapterId, chapterId))
      .orderBy((lineItems) => [asc(lineItems.order)])
      .all()
  },

  update: async (id: string, lineItem: Partial<Omit<LineItem, 'id'>>) => {
    const [result] = await db
      .update(lineItems)
      .set({
        chapterId: lineItem.chapterId,
        code: lineItem.code,
        description: lineItem.description,
        unit: lineItem.unit,
        quantity: lineItem.quantity,
        unitPrice: lineItem.unitPrice,
        amount: lineItem.amount,
        order: lineItem.order,
      })
      .where(eq(lineItems.id, id))
      .returning()

    return result as LineItem
  },

  delete: async (id: string) => {
    await db.delete(lineItems).where(eq(lineItems.id, id))
  },
}

// Deserializes a raw `templates` row (JSON-text columns) into a domain Template.
const toDomainTemplate = (row: typeof templates.$inferSelect): Template => ({
  id: row.id,
  name: row.name,
  isDefault: row.isDefault,
  page: JSON.parse(row.page),
  typography: JSON.parse(row.typography),
  colors: JSON.parse(row.colors),
  cover: JSON.parse(row.cover),
  header: JSON.parse(row.header),
  footer: JSON.parse(row.footer),
  table: JSON.parse(row.table),
  finalPage: JSON.parse(row.finalPage),
})

// Template repository
export const templateRepository = {
  create: async (template: Omit<Template, 'id'>) => {
    const id = randomUUID()
    const [result] = await db
      .insert(templates)
      .values({
        id,
        name: template.name,
        isDefault: template.isDefault,
        page: JSON.stringify(template.page),
        typography: JSON.stringify(template.typography),
        colors: JSON.stringify(template.colors),
        cover: JSON.stringify(template.cover),
        header: JSON.stringify(template.header),
        footer: JSON.stringify(template.footer),
        table: JSON.stringify(template.table),
        finalPage: JSON.stringify(template.finalPage),
      })
      .returning()

    return toDomainTemplate(result)
  },

  findById: async (id: string) => {
    const result = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .get()
    if (!result) return null

    return toDomainTemplate(result)
  },

  findMany: async () => {
    const results = await db.select().from(templates).all()
    return results.map(toDomainTemplate)
  },

  update: async (id: string, template: Partial<Omit<Template, 'id'>>) => {
    const existing = await db.select().from(templates).where(eq(templates.id, id)).get()
    if (!existing) {
      throw new Error(`Template ${id} not found`)
    }
    const merged = { ...toDomainTemplate(existing), ...template }

    const [result] = await db
      .update(templates)
      .set({
        name: merged.name,
        isDefault: merged.isDefault,
        page: JSON.stringify(merged.page),
        typography: JSON.stringify(merged.typography),
        colors: JSON.stringify(merged.colors),
        cover: JSON.stringify(merged.cover),
        header: JSON.stringify(merged.header),
        footer: JSON.stringify(merged.footer),
        table: JSON.stringify(merged.table),
        finalPage: JSON.stringify(merged.finalPage),
      })
      .where(eq(templates.id, id))
      .returning()

    return toDomainTemplate(result)
  },

  delete: async (id: string) => {
    await db.delete(templates).where(eq(templates.id, id))
  },
}

// UserProfile repository
export const userProfileRepository = {
  create: async (profile: Omit<UserProfile, 'id'>) => {
    const id = randomUUID()
    const [result] = await db
      .insert(userProfiles)
      .values({
        id,
        name: profile.name,
        address: profile.address,
        postalCode: profile.postalCode,
        phone: profile.phone,
        email: profile.email,
        slogan: profile.slogan,
      })
      .returning()

    return result as UserProfile
  },

  findById: async (id: string) => {
    const result = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, id))
      .get()
    return result ?? null
  },

  findMany: async () => {
    return await db.select().from(userProfiles).all()
  },

  update: async (id: string, profile: Partial<Omit<UserProfile, 'id'>>) => {
    const [result] = await db
      .update(userProfiles)
      .set({
        name: profile.name,
        address: profile.address,
        postalCode: profile.postalCode,
        phone: profile.phone,
        email: profile.email,
        slogan: profile.slogan,
      })
      .where(eq(userProfiles.id, id))
      .returning()

    return result as UserProfile
  },

  delete: async (id: string) => {
    await db.delete(userProfiles).where(eq(userProfiles.id, id))
  },
}

// StandardText repository
export const standardTextRepository = {
  create: async (text: Omit<StandardText, 'id'>) => {
    const id = randomUUID()
    const [result] = await db
      .insert(standardTexts)
      .values({
        id,
        key: text.key,
        title: text.title,
        content: text.content,
      })
      .returning()

    return result as StandardText
  },

  findById: async (id: string) => {
    const result = await db
      .select()
      .from(standardTexts)
      .where(eq(standardTexts.id, id))
      .get()
    return result ?? null
  },

  findByKey: async (key: string) => {
    const result = await db
      .select()
      .from(standardTexts)
      .where(eq(standardTexts.key, key))
      .get()
    return result ?? null
  },

  findMany: async () => {
    return await db.select().from(standardTexts).all()
  },

  update: async (id: string, text: Partial<Omit<StandardText, 'id'>>) => {
    const [result] = await db
      .update(standardTexts)
      .set({
        key: text.key,
        title: text.title,
        content: text.content,
      })
      .where(eq(standardTexts.id, id))
      .returning()

    return result as StandardText
  },

  delete: async (id: string) => {
    await db.delete(standardTexts).where(eq(standardTexts.id, id))
  },
}
