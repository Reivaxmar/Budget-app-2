import type { Customer } from '../domain/models'
import { createSupabaseCrudRepository } from './supabaseCrudRepository'

interface CustomerRow {
  id: string
  name: string
  address: string
  phone: string
  email: string
  tax_id: string
  notes: string
}

const toRow = (customer: Partial<Omit<Customer, 'id'>>): Record<string, unknown> => ({
  ...(customer.name !== undefined && { name: customer.name }),
  ...(customer.address !== undefined && { address: customer.address }),
  ...(customer.phone !== undefined && { phone: customer.phone }),
  ...(customer.email !== undefined && { email: customer.email }),
  ...(customer.taxId !== undefined && { tax_id: customer.taxId }),
  ...(customer.notes !== undefined && { notes: customer.notes }),
})

const fromRow = (row: CustomerRow): Customer => ({
  id: row.id,
  name: row.name,
  address: row.address,
  phone: row.phone,
  email: row.email,
  taxId: row.tax_id,
  notes: row.notes,
})

export const customerRepositoryClient = createSupabaseCrudRepository<Customer, CustomerRow>(
  'customers',
  toRow,
  fromRow
)
