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

// Template repository
export const templateRepository = {
  create: async (template: Omit<Template, 'id'>) => {
    const id = randomUUID()
    const [result] = await db
      .insert(templates)
      .values({
        id,
        name: template.name,
        cover: JSON.stringify(template.cover),
        header: JSON.stringify(template.header),
        footer: JSON.stringify(template.footer),
        typography: JSON.stringify(template.typography),
        spacing: JSON.stringify(template.spacing),
        tableRules: JSON.stringify(template.tableRules),
      })
      .returning()

    return {
      ...result,
      cover: JSON.parse(result.cover),
      header: JSON.parse(result.header),
      footer: JSON.parse(result.footer),
      typography: JSON.parse(result.typography),
      spacing: JSON.parse(result.spacing),
      tableRules: JSON.parse(result.tableRules),
    } as Template
  },

  findById: async (id: string) => {
    const result = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .get()
    if (!result) return null

    return {
      ...result,
      cover: JSON.parse(result.cover),
      header: JSON.parse(result.header),
      footer: JSON.parse(result.footer),
      typography: JSON.parse(result.typography),
      spacing: JSON.parse(result.spacing),
      tableRules: JSON.parse(result.tableRules),
    } as Template
  },

  findMany: async () => {
    const results = await db.select().from(templates).all()
    return results.map((r) => ({
      ...r,
      cover: JSON.parse(r.cover),
      header: JSON.parse(r.header),
      footer: JSON.parse(r.footer),
      typography: JSON.parse(r.typography),
      spacing: JSON.parse(r.spacing),
      tableRules: JSON.parse(r.tableRules),
    })) as Template[]
  },

  update: async (id: string, template: Partial<Omit<Template, 'id'>>) => {
    const [result] = await db
      .update(templates)
      .set({
        name: template.name,
        cover: JSON.stringify(template.cover ?? {}),
        header: JSON.stringify(template.header ?? {}),
        footer: JSON.stringify(template.footer ?? {}),
        typography: JSON.stringify(template.typography ?? {}),
        spacing: JSON.stringify(template.spacing ?? {}),
        tableRules: JSON.stringify(template.tableRules ?? {}),
      })
      .where(eq(templates.id, id))
      .returning()

    return {
      ...result,
      cover: JSON.parse(result.cover),
      header: JSON.parse(result.header),
      footer: JSON.parse(result.footer),
      typography: JSON.parse(result.typography),
      spacing: JSON.parse(result.spacing),
      tableRules: JSON.parse(result.tableRules),
    } as Template
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
