import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// Since we are using SQLite, we use sqliteTable
// Note: drizzle-orm/sqlite-core provides sqliteTable

// Customers table
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  email: text('email').notNull(),
  taxId: text('tax_id'),
  notes: text('notes'),
})

// Estimates table
export const estimates = sqliteTable('estimates', {
  id: text('id').primaryKey(),
  estimateNumber: text('estimate_number').notNull().unique(),
  year: integer('year').notNull(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  subject: text('subject').notNull(),
  site: text('site').notNull(),
  creationDate: text('creation_date').notNull(), // ISO string
  status: text('status').notNull().default('draft'),
  taxRate: real('tax_rate').notNull().default(0),
})

// Chapters table
export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  estimateId: text('estimate_id')
    .notNull()
    .references(() => estimates.id),
  title: text('title').notNull(),
  order: integer('order').notNull(),
})

// Line items table
export const lineItems = sqliteTable('line_items', {
  id: text('id').primaryKey(),
  chapterId: text('chapter_id')
    .notNull()
    .references(() => chapters.id),
  code: text('code').notNull(),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  amount: real('amount').notNull(), // quantity * unitPrice
  order: integer('order').notNull(),
})

// Templates table (simplified as per the domain model)
export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // We'll store the JSON object as text for simplicity, or we can break it out.
  // For now, we'll store the entire template as a JSON string.
  // Alternatively, we can create separate tables for each section, but the domain model is nested.
  // Since the domain model for Template is nested and we want to keep it simple, we'll store as JSON.
  cover: text('cover').notNull().default('{}'),
  header: text('header').notNull().default('{}'),
  footer: text('footer').notNull().default('{}'),
  typography: text('typography').notNull().default('{}'),
  spacing: text('spacing').notNull().default('{}'),
  tableRules: text('table_rules').notNull().default('{}'),
})

// UserProfile table
export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  postalCode: text('postal_code').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  slogan: text('slogan'),
})

// StandardText table
export const standardTexts = sqliteTable('standard_texts', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  content: text('content').notNull(),
})

// Relations (optional, but useful for queries)
export const customersRelations = relations(customers, function (rel) {
  return {
    estimates: rel.many(estimates),
  }
})

export const estimatesRelations = relations(estimates, function (rel) {
  return {
    customer: rel.one(customers, {
      fields: [estimates.customerId],
      references: [customers.id],
    }),
    chapters: rel.many(chapters),
  }
})

export const chaptersRelations = relations(chapters, function (rel) {
  return {
    estimate: rel.one(estimates, {
      fields: [chapters.estimateId],
      references: [estimates.id],
    }),
    lineItems: rel.many(lineItems),
  }
})

export const lineItemsRelations = relations(lineItems, function (rel) {
  return {
    chapter: rel.one(chapters, {
      fields: [lineItems.chapterId],
      references: [chapters.id],
    }),
  }
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const userProfilesRelations = relations(userProfiles, function (_) {
  return {
    // No direct relations, but we can add if needed
  }
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const standardTextsRelations = relations(standardTexts, function (_) {
  return {
    // No direct relations
  }
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const templatesRelations = relations(templates, function (_) {
  return {
    // No direct relations
  }
})

// Export TypeScript types for each table
export type Customer = typeof customers.$inferSelect
export type Estimate = typeof estimates.$inferSelect
export type Chapter = typeof chapters.$inferSelect
export type LineItem = typeof lineItems.$inferSelect
export type Template = typeof templates.$inferSelect
export type UserProfile = typeof userProfiles.$inferSelect
export type StandardText = typeof standardTexts.$inferSelect

// Export insert types (excluding auto-generated fields like id)
export type InsertCustomer = Omit<Customer, 'id'>
export type InsertEstimate = Omit<Estimate, 'id'>
export type InsertChapter = Omit<Chapter, 'id'>
export type InsertLineItem = Omit<LineItem, 'id'>
export type InsertTemplate = Omit<Template, 'id'>
export type InsertUserProfile = Omit<UserProfile, 'id'>
export type InsertStandardText = Omit<StandardText, 'id'>
