import type { Customer } from '../domain/models'

const STORAGE_KEY = 'budgetapp.customers'

const readCustomers = (): Customer[] => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Customer[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

const writeCustomers = (customers: Customer[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers))
}

const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const customerRepositoryClient = {
  create: async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    const newCustomer: Customer = { ...customer, id: createId() }
    const customers = readCustomers()
    customers.push(newCustomer)
    writeCustomers(customers)
    return newCustomer
  },

  findById: async (id: string): Promise<Customer | null> => {
    const customers = readCustomers()
    return customers.find((customer) => customer.id === id) ?? null
  },

  findMany: async (): Promise<Customer[]> => {
    return readCustomers()
  },

  update: async (
    id: string,
    customer: Partial<Omit<Customer, 'id'>>,
  ): Promise<Customer> => {
    const customers = readCustomers()
    const index = customers.findIndex((item) => item.id === id)

    if (index < 0) {
      throw new Error(`Customer ${id} not found`)
    }

    const updatedCustomer: Customer = {
      ...customers[index],
      ...customer,
      id,
    }

    customers[index] = updatedCustomer
    writeCustomers(customers)
    return updatedCustomer
  },

  delete: async (id: string): Promise<void> => {
    const customers = readCustomers().filter((customer) => customer.id !== id)
    writeCustomers(customers)
  },
}
