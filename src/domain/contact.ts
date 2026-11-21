import type { Customer, Estimate } from './models'

/**
 * The contact person shown for an estimate: its own contactName/contactPhone
 * when set, otherwise the customer's name/phone. Each field falls back
 * independently, so an estimate with only a contact name still shows the
 * customer's phone rather than a blank.
 */
export function resolveEstimateContact(
  estimate: Pick<Estimate, 'contactName' | 'contactPhone'>,
  customer: Pick<Customer, 'name' | 'phone'>
): { name: string; phone: string } {
  return {
    name: estimate.contactName?.trim() ? estimate.contactName : customer.name,
    phone: estimate.contactPhone?.trim() ? estimate.contactPhone : customer.phone,
  }
}
