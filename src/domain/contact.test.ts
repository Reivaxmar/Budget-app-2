import { describe, expect, it } from 'vitest'
import { resolveEstimateContact } from './contact'

const customer = { name: 'Construcciones García', phone: '+34 600111222' }

describe('resolveEstimateContact', () => {
  it("falls back to the customer's name and phone when the contact is empty", () => {
    expect(resolveEstimateContact({ contactName: '', contactPhone: '' }, customer)).toEqual({
      name: 'Construcciones García',
      phone: '+34 600111222',
    })
  })

  it('treats whitespace-only values as empty', () => {
    expect(resolveEstimateContact({ contactName: '  ', contactPhone: ' ' }, customer)).toEqual({
      name: 'Construcciones García',
      phone: '+34 600111222',
    })
  })

  it("uses the estimate's own contact when set", () => {
    expect(
      resolveEstimateContact({ contactName: 'Luis (encargado)', contactPhone: '+34 699000111' }, customer)
    ).toEqual({ name: 'Luis (encargado)', phone: '+34 699000111' })
  })

  it('falls back per field', () => {
    expect(resolveEstimateContact({ contactName: 'Luis', contactPhone: '' }, customer)).toEqual({
      name: 'Luis',
      phone: '+34 600111222',
    })
  })
})
