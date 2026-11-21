import { describe, expect, it } from 'vitest'
import {
  emptyPaymentConditions,
  hasPaymentConditions,
  normalizePaymentConditions,
  setPaymentStagePercentage,
  togglePaymentStage,
  totalPaymentPercentage,
} from './paymentConditions'

describe('normalizePaymentConditions', () => {
  it('returns empty conditions for missing/invalid data (estimates saved before the field existed)', () => {
    expect(normalizePaymentConditions(undefined)).toEqual(emptyPaymentConditions())
    expect(normalizePaymentConditions(null)).toEqual(emptyPaymentConditions())
    expect(normalizePaymentConditions('nope')).toEqual(emptyPaymentConditions())
  })

  it('drops unknown types and duplicates, fixes bad percentages and sorts into display order', () => {
    expect(
      normalizePaymentConditions({
        stages: [
          { type: 'completion', percentage: 30 },
          { type: 'bogus', percentage: 10 },
          { type: 'acceptance', percentage: '40' },
          { type: 'completion', percentage: 99 },
          { type: 'start', percentage: -5 },
        ],
        notes: 42,
      })
    ).toEqual({
      stages: [
        { type: 'acceptance', percentage: 40 },
        { type: 'start', percentage: 0 },
        { type: 'completion', percentage: 30 },
      ],
      notes: '',
    })
  })
})

describe('togglePaymentStage', () => {
  it('pre-fills a newly selected stage with the remainder up to 100%', () => {
    let c = togglePaymentStage(emptyPaymentConditions(), 'acceptance', true)
    expect(c.stages).toEqual([{ type: 'acceptance', percentage: 100 }])
    c = setPaymentStagePercentage(c, 'acceptance', 30)
    c = togglePaymentStage(c, 'completion', true)
    expect(c.stages).toEqual([
      { type: 'acceptance', percentage: 30 },
      { type: 'completion', percentage: 70 },
    ])
  })

  it('never pre-fills a negative remainder', () => {
    const c = togglePaymentStage({ stages: [{ type: 'start', percentage: 120 }], notes: '' }, 'midway', true)
    expect(c.stages.find((s) => s.type === 'midway')?.percentage).toBe(0)
  })

  it('keeps display order regardless of selection order', () => {
    let c = togglePaymentStage(emptyPaymentConditions(), 'certifications', true)
    c = togglePaymentStage(c, 'start', true)
    expect(c.stages.map((s) => s.type)).toEqual(['start', 'certifications'])
  })

  it('removes a stage when deselected', () => {
    const c = togglePaymentStage({ stages: [{ type: 'start', percentage: 50 }], notes: 'x' }, 'start', false)
    expect(c).toEqual({ stages: [], notes: 'x' })
  })
})

describe('totalPaymentPercentage / hasPaymentConditions', () => {
  it('sums without float noise', () => {
    const c = {
      stages: [
        { type: 'start' as const, percentage: 33.33 },
        { type: 'midway' as const, percentage: 33.33 },
        { type: 'completion' as const, percentage: 33.34 },
      ],
      notes: '',
    }
    expect(totalPaymentPercentage(c)).toBe(100)
  })

  it('reports content only when there are stages or non-blank notes', () => {
    expect(hasPaymentConditions(emptyPaymentConditions())).toBe(false)
    expect(hasPaymentConditions({ stages: [], notes: '   ' })).toBe(false)
    expect(hasPaymentConditions({ stages: [], notes: 'Transferencia' })).toBe(true)
  })
})
