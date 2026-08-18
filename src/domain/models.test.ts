import { describe, it, expect } from 'vitest'
import type {
  Estimate,
  Customer,
  Chapter,
  LineItem,
  Template,
  UserProfile,
  StandardText,
} from './models'

describe('Domain Models', () => {
  describe('Estimate', () => {
    it('should have the correct properties', () => {
      const estimate: Estimate = {
        id: 'estimate-1',
        estimateNumber: '001-24',
        year: 2024,
        customerId: 'customer-1',
        subject: 'Test Estimate',
        site: 'Test Construction Site',
        creationDate: new Date().toISOString(),
        status: 'draft',
        taxRate: 19,
      }

      expect(estimate).toHaveProperty('id')
      expect(estimate).toHaveProperty('estimateNumber')
      expect(estimate).toHaveProperty('year')
      expect(estimate).toHaveProperty('customerId')
      expect(estimate).toHaveProperty('subject')
      expect(estimate).toHaveProperty('site')
      expect(estimate).toHaveProperty('creationDate')
      expect(estimate).toHaveProperty('status')
      expect(estimate).toHaveProperty('taxRate')

      // Check types
      expect(typeof estimate.id).toBe('string')
      expect(typeof estimate.estimateNumber).toBe('string')
      expect(typeof estimate.year).toBe('number')
      expect(typeof estimate.customerId).toBe('string')
      expect(typeof estimate.subject).toBe('string')
      expect(typeof estimate.site).toBe('string')
      expect(typeof estimate.creationDate).toBe('string')
      expect(typeof estimate.status).toBe('string')
      expect(typeof estimate.taxRate).toBe('number')
    })
  })

  describe('Customer', () => {
    it('should have the correct properties', () => {
      const customer: Customer = {
        id: 'customer-1',
        name: 'Test Customer',
        address: '123 Test Street',
        phone: '555-1234',
        email: 'test@example.com',
        taxId: 'TAX123456',
        notes: 'Test customer notes',
      }

      expect(customer).toHaveProperty('id')
      expect(customer).toHaveProperty('name')
      expect(customer).toHaveProperty('address')
      expect(customer).toHaveProperty('phone')
      expect(customer).toHaveProperty('email')
      expect(customer).toHaveProperty('taxId')
      expect(customer).toHaveProperty('notes')

      // Check types
      expect(typeof customer.id).toBe('string')
      expect(typeof customer.name).toBe('string')
      expect(typeof customer.address).toBe('string')
      expect(typeof customer.phone).toBe('string')
      expect(typeof customer.email).toBe('string')
      expect(typeof customer.taxId).toBe('string')
      expect(typeof customer.notes).toBe('string')
    })
  })

  describe('Chapter', () => {
    it('should have the correct properties', () => {
      const chapter: Chapter = {
        id: 'chapter-1',
        estimateId: 'estimate-1',
        title: 'Test Chapter',
        order: 1,
      }

      expect(chapter).toHaveProperty('id')
      expect(chapter).toHaveProperty('estimateId')
      expect(chapter).toHaveProperty('title')
      expect(chapter).toHaveProperty('order')

      // Check types
      expect(typeof chapter.id).toBe('string')
      expect(typeof chapter.estimateId).toBe('string')
      expect(typeof chapter.title).toBe('string')
      expect(typeof chapter.order).toBe('number')
    })
  })

  describe('LineItem', () => {
    it('should have the correct properties', () => {
      const lineItem: LineItem = {
        id: 'lineitem-1',
        chapterId: 'chapter-1',
        code: 'CODE001',
        description: 'Test Line Item',
        unit: 'pcs',
        quantity: 10,
        unitPrice: 5.99,
        amount: 59.9,
        order: 1,
      }

      expect(lineItem).toHaveProperty('id')
      expect(lineItem).toHaveProperty('chapterId')
      expect(lineItem).toHaveProperty('code')
      expect(lineItem).toHaveProperty('description')
      expect(lineItem).toHaveProperty('unit')
      expect(lineItem).toHaveProperty('quantity')
      expect(lineItem).toHaveProperty('unitPrice')
      expect(lineItem).toHaveProperty('amount')
      expect(lineItem).toHaveProperty('order')

      // Check types
      expect(typeof lineItem.id).toBe('string')
      expect(typeof lineItem.chapterId).toBe('string')
      expect(typeof lineItem.code).toBe('string')
      expect(typeof lineItem.description).toBe('string')
      expect(typeof lineItem.unit).toBe('string')
      expect(typeof lineItem.quantity).toBe('number')
      expect(typeof lineItem.unitPrice).toBe('number')
      expect(typeof lineItem.amount).toBe('number')
      expect(typeof lineItem.order).toBe('number')
    })
  })

  describe('Template', () => {
    it('should have the correct properties', () => {
      const template: Template = {
        id: 'template-1',
        name: 'Default Template',
        isDefault: true,
        page: {
          size: 'A4',
          marginPt: 48,
        },
        typography: {
          fontFamily: 'Helvetica',
          baseFontSize: 9,
          titleFontSize: 22,
          headingFontSize: 12,
        },
        colors: {
          text: '#1a1a1a',
          muted: '#666666',
          tableHeaderBackground: '#eeeeee',
          borderColor: '#cccccc',
        },
        cover: {
          backgroundImage: 'https://example.com/cover.jpg',
          showCreationLocationDate: true,
          showSlogan: true,
        },
        header: {
          showEstimateNumberAndDate: true,
        },
        footer: {
          showPageNumbers: true,
          showCompanyInfo: true,
        },
        table: {
          showBorders: true,
          columns: [{ key: 'description', label: 'Description', width: '100%' }],
        },
        finalPage: {
          totalLabel: 'Total',
          totalCaption: 'IVA no incluido / VAT not included',
          signatureLabel: 'Conforme cliente',
        },
      }

      expect(template).toHaveProperty('id')
      expect(template).toHaveProperty('name')
      expect(template).toHaveProperty('isDefault')
      expect(template).toHaveProperty('page')
      expect(template).toHaveProperty('cover')
      expect(template).toHaveProperty('header')
      expect(template).toHaveProperty('footer')
      expect(template).toHaveProperty('typography')
      expect(template).toHaveProperty('colors')
      expect(template).toHaveProperty('table')
      expect(template).toHaveProperty('finalPage')

      // Check types of top-level properties
      expect(typeof template.id).toBe('string')
      expect(typeof template.name).toBe('string')
      expect(typeof template.isDefault).toBe('boolean')
      expect(typeof template.page).toBe('object')
      expect(typeof template.cover).toBe('object')
      expect(typeof template.header).toBe('object')
      expect(typeof template.footer).toBe('object')
      expect(typeof template.typography).toBe('object')
      expect(typeof template.colors).toBe('object')
      expect(typeof template.table).toBe('object')
      expect(typeof template.finalPage).toBe('object')
    })
  })

  describe('UserProfile', () => {
    it('should have the correct properties', () => {
      const userProfile: UserProfile = {
        id: 'profile-1',
        name: 'Test Company',
        address: '456 Business Ave',
        postalCode: '12345',
        phone: '555-9876',
        email: 'info@testcompany.com',
        slogan: 'Quality Construction Since 2020',
      }

      expect(userProfile).toHaveProperty('id')
      expect(userProfile).toHaveProperty('name')
      expect(userProfile).toHaveProperty('address')
      expect(userProfile).toHaveProperty('postalCode')
      expect(userProfile).toHaveProperty('phone')
      expect(userProfile).toHaveProperty('email')
      expect(userProfile).toHaveProperty('slogan')

      // Check types
      expect(typeof userProfile.id).toBe('string')
      expect(typeof userProfile.name).toBe('string')
      expect(typeof userProfile.address).toBe('string')
      expect(typeof userProfile.postalCode).toBe('string')
      expect(typeof userProfile.phone).toBe('string')
      expect(typeof userProfile.email).toBe('string')
      expect(typeof userProfile.slogan).toBe('string')
    })
  })

  describe('StandardText', () => {
    it('should have the correct properties', () => {
      const standardText: StandardText = {
        id: 'text-1',
        key: 'terms_and_conditions',
        title: 'Terms and Conditions',
        content:
          'These are the standard terms and conditions for all estimates.',
      }

      expect(standardText).toHaveProperty('id')
      expect(standardText).toHaveProperty('key')
      expect(standardText).toHaveProperty('title')
      expect(standardText).toHaveProperty('content')

      // Check types
      expect(typeof standardText.id).toBe('string')
      expect(typeof standardText.key).toBe('string')
      expect(typeof standardText.title).toBe('string')
      expect(typeof standardText.content).toBe('string')
    })
  })
})
