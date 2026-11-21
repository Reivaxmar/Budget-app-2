import { PAYMENT_STAGE_TYPES } from './models'
import type { PaymentConditions, PaymentStage, PaymentStageType } from './models'

export function emptyPaymentConditions(): PaymentConditions {
  return { stages: [], notes: '' }
}

function isStageType(value: unknown): value is PaymentStageType {
  return typeof value === 'string' && (PAYMENT_STAGE_TYPES as readonly string[]).includes(value)
}

/**
 * Coerces whatever was stored (jsonb column, backup file, or nothing at all
 * for estimates saved before this field existed) into a valid
 * PaymentConditions: unknown stage types and duplicates are dropped, bad
 * percentages become 0, and stages are put in canonical display order.
 */
export function normalizePaymentConditions(raw: unknown): PaymentConditions {
  if (!raw || typeof raw !== 'object') return emptyPaymentConditions()
  const { stages, notes } = raw as { stages?: unknown; notes?: unknown }

  const byType = new Map<PaymentStageType, number>()
  if (Array.isArray(stages)) {
    for (const stage of stages) {
      if (!stage || typeof stage !== 'object') continue
      const { type, percentage } = stage as { type?: unknown; percentage?: unknown }
      if (!isStageType(type) || byType.has(type)) continue
      const value = typeof percentage === 'number' ? percentage : Number(percentage)
      byType.set(type, Number.isFinite(value) && value >= 0 ? value : 0)
    }
  }

  return {
    stages: PAYMENT_STAGE_TYPES.filter((type) => byType.has(type)).map((type) => ({
      type,
      percentage: byType.get(type)!,
    })),
    notes: typeof notes === 'string' ? notes : '',
  }
}

/**
 * Selects or deselects a stage. A newly selected stage starts with whatever
 * is left to reach 100% (never negative), which is usually what the user
 * wants for the last stage they tick.
 */
export function togglePaymentStage(
  conditions: PaymentConditions,
  type: PaymentStageType,
  selected: boolean
): PaymentConditions {
  const others = conditions.stages.filter((stage) => stage.type !== type)
  if (!selected) return { ...conditions, stages: others }
  const remaining = Math.max(0, 100 - totalPaymentPercentage({ ...conditions, stages: others }))
  return normalizePaymentConditions({
    ...conditions,
    stages: [...others, { type, percentage: remaining }],
  })
}

export function setPaymentStagePercentage(
  conditions: PaymentConditions,
  type: PaymentStageType,
  percentage: number
): PaymentConditions {
  return {
    ...conditions,
    stages: conditions.stages.map((stage: PaymentStage) =>
      stage.type === type ? { ...stage, percentage: Number.isFinite(percentage) && percentage >= 0 ? percentage : 0 } : stage
    ),
  }
}

/** Sum of the selected stages' percentages, rounded to 2 decimals to avoid float noise (e.g. 33.33 * 3). */
export function totalPaymentPercentage(conditions: PaymentConditions): number {
  const total = conditions.stages.reduce((sum, stage) => sum + stage.percentage, 0)
  return Math.round(total * 100) / 100
}

/** Whether there's anything to print — the PDF omits the section otherwise. */
export function hasPaymentConditions(conditions: PaymentConditions): boolean {
  return conditions.stages.length > 0 || conditions.notes.trim() !== ''
}
