import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { customers, Customer } from './schema'

// Test database setup
let testDb: ReturnType<typeof Database>
let db: ReturnType<typeof drizzle>

beforeEach(() => {
  // Create an in-memory database for testing
  testDb = new Database(':memory:')
  db = drizzle(testDb)

  // Create customers table using raw SQL matching the schema
  testDb.exec(`
    CREATE TABLE customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      email TEXT NOT NULL,
      tax_id TEXT,
      notes TEXT
    )
  `)
  // Note: other tables are not created as we only test customer repository
})

afterEach(() => {
  testDb.close()
})

// Helper to convert nullable fields to empty string for domain model
const toDomainString = (value: string | null): string => value ?? ''

// Customer repository functions (using correct Drizzle ORM API for better-sqlite3)
const customerRepository = {
  create: async (customer: Omit<Customer, 'id'>) => {
    const id = randomUUID()
    const result = await db
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
      .get()

    return {
      ...result,
      phone: toDomainString(result.phone),
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
      ...result,
      phone: toDomainString(result.phone),
      taxId: toDomainString(result.taxId),
      notes: toDomainString(result.notes),
    } as Customer
  },

  findMany: async () => {
    const results = await db.select().from(customers).all()
    return results.map((r) => ({
      ...r,
      phone: toDomainString(r.phone),
      taxId: toDomainString(r.taxId),
      notes: toDomainString(r.notes),
    })) as Customer[]
  },

  update: async (id: string, customer: Partial<Omit<Customer, 'id'>>) => {
    const result = await db
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
      .get()

    return {
      ...result,
      phone: toDomainString(result.phone),
      taxId: toDomainString(result.taxId),
      notes: toDomainString(result.notes),
    } as Customer
  },

  delete: async (id: string) => {
    await db.delete(customers).where(eq(customers.id, id))
  },
}

describe('Customer Repository', () => {
  it('should create and fetch a customer', async () => {
    // Create a customer
    const created = await customerRepository.create({
      name: 'Test Customer',
      address: '123 Test Street',
      phone: '555-1234',
      email: 'test@example.com',
      taxId: 'TAX123456',
      notes: 'Test notes',
    })

    expect(created).toMatchObject({
      id: expect.any(String),
      name: 'Test Customer',
      address: '123 Test Street',
      phone: '555-1234',
      email: 'test@example.com',
      taxId: 'TAX123456',
      notes: 'Test notes',
    })

    // Fetch by id
    const fetched = await customerRepository.findById(created.id)
    expect(fetched).toMatchObject(created)
  })

  it('should update a customer', async () => {
    // Create a customer
    const created = await customerRepository.create({
      name: 'Original Name',
      address: 'Original Address',
      phone: '555-0000',
      email: 'original@example.com',
      taxId: '',
      notes: '',
    })

    // Update the customer
    const updated = await customerRepository.update(created.id, {
      name: 'Updated Name',
      address: 'Updated Address',
      phone: '555-9999',
      email: 'updated@example.com',
      taxId: 'TAX999999',
      notes: 'Updated notes',
    })

    expect(updated).toMatchObject({
      id: created.id,
      name: 'Updated Name',
      address: 'Updated Address',
      phone: '555-9999',
      email: 'updated@example.com',
      taxId: 'TAX999999',
      notes: 'Updated notes',
    })
  })

  it('should delete a customer', async () => {
    // Create a customer
    const created = await customerRepository.create({
      name: 'To Delete',
      address: 'Delete Address',
      phone: '555-1111',
      email: 'delete@example.com',
      taxId: '',
      notes: '',
    })

    // Delete the customer
    await customerRepository.delete(created.id)

    // Attempt to fetch the deleted customer
    const fetched = await customerRepository.findById(created.id)
    expect(fetched).toBeNull()
  })

  it('should list all customers', async () => {
    // Create two customers
    await customerRepository.create({
      name: 'Customer 1',
      address: 'Address 1',
      phone: '555-0001',
      email: 'c1@example.com',
      taxId: '',
      notes: '',
    })

    await customerRepository.create({
      name: 'Customer 2',
      address: 'Address 2',
      phone: '555-0002',
      email: 'c2@example.com',
      taxId: '',
      notes: '',
    })

    const results = await customerRepository.findMany()
    expect(results).toHaveLength(2)

    const names = results.map((r) => r.name)
    expect(names).toContain('Customer 1')
    expect(names).toContain('Customer 2')
  })
})
