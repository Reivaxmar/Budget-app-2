// Pure domain calculations. No persistence or UI imports here — this module
// is safe to use from the rendering layer, which must stay independent from
// the database and the estimate editor (SPECS.md §11, §21).

import type { Chapter, Estimate, LineItem } from './models';

export interface ChapterWithLineItems extends Chapter {
  lineItems: LineItem[];
}

export interface EstimateWithDetails extends Estimate {
  chapters: ChapterWithLineItems[];
}

/**
 * Calculates the total amount of a chapter from its line items.
 */
export function calculateChapterTotal(chapter: ChapterWithLineItems): number {
  return chapter.lineItems.reduce((total, item) => total + item.amount, 0);
}

/**
 * Calculates the total amount of an estimate from its chapters and line items.
 */
export function calculateEstimateTotal(estimate: EstimateWithDetails): number {
  return estimate.chapters.reduce((total, chapter) => total + calculateChapterTotal(chapter), 0);
}
