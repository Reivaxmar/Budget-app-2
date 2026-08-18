// Input data shape for the document rendering engine.
// This is intentionally decoupled from persistence: the renderer only cares
// about the structured data it needs to lay out a page, not where it came
// from (repository, mock data, or a future template-driven data source).

import type { Customer, Estimate, StandardText, UserProfile } from '../domain/models';
import type { ChapterWithLineItems } from '../domain/calculations';

export interface EstimateDocumentData {
  estimate: Estimate;
  customer: Customer;
  chapters: ChapterWithLineItems[];
  company: UserProfile;
  standardNote: StandardText;
  /** Location shown next to the creation date, e.g. "Barcelona". */
  creationLocation: string;
}
