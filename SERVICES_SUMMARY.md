# Estimate Service Implementation

## Overview
This implementation provides domain and application services for estimates in the Construction Estimate & Quote Management Application. It supports creating, loading, saving, duplicating, and deleting estimates, including chapters and line items.

## Features
- **Estimate Number Generation**: Automatically generates estimate numbers in the format "###-YY" (e.g., "001-24") based on the year and sequence of estimates in that year.
- **Estimate CRUD Operations**:
  - Create new estimates with generated estimate numbers
  - Retrieve estimates with their chapters and line items (nested structure)
  - Update estimate headers (without affecting chapters/line items)
  - Delete estimates and all associated chapters and line items
  - Duplicate estimates (creates a copy with new ID and estimate number, duplicating chapters and line items)
- **Monetary Calculations**:
  - Calculate total amount of an estimate from its chapters and line items
  - Calculate total amount of a chapter from its line items
- **Data Integrity**: Ensures proper cascading deletes when removing estimates

## Implementation Details
### Files Created
- `src/services/estimateService.ts` - Main service implementation
- `src/services/index.ts` - Barrel export for the services directory

### Key Functions
1. `generateEstimateNumber(year: number): Promise<string>`
   - Internal function to generate unique estimate numbers
   - Format: "###-YY" where ### is a zero-padded sequence number and YY is the last two digits of the year

2. `createEstimate(data: Omit<Estimate, 'id' | 'estimateNumber'>): Promise<Estimate>`
   - Creates a new estimate header with an auto-generated estimate number
   - Returns the complete estimate including id and estimateNumber

3. `getEstimateWithDetails(id: string): Promise<EstimateWithDetails | null>`
   - Retrieves an estimate by ID with all its chapters and line items
   - Returns null if estimate not found

4. `updateEstimateHeader(id: string, data: Partial<Omit<Estimate, 'id'>>): Promise<Estimate>`
   - Updates only the estimate header fields
   - Chapters and line items are unaffected

5. `deleteEstimate(id: string): Promise<void>`
   - Deletes an estimate and all associated data
   - Deletes line items first, then chapters, then the estimate

6. `duplicateEstimate(id: string): Promise<Estimate>`
   - Creates a copy of an estimate with a new ID and estimate number
   - Duplicates all chapters and line items with their original order preserved

7. `calculateEstimateTotal(estimate: EstimateWithDetails): number`
   - Calculates the sum of all line item amounts in an estimate

8. `calculateChapterTotal(chapter: ChapterWithLineItems): number`
   - Calculates the sum of all line item amounts in a chapter

### Types
- `ChapterWithLineItems`: Chapter entity with nested lineItems array
- `EstimateWithDetails`: Estimate entity with nested chapters array (each containing lineItems)

### Dependencies
- Uses existing persistence layer (`src/db/repository`)
- Uses existing domain models (`src/domain/models`)
- Leverages UUID generation for entity IDs
- Uses Drizzle ORM for database operations

## Usage Example
```typescript
import { estimateService } from './services';

// Create a new estimate
const newEstimate = await estimateService.createEstimate({
  year: 2024,
  customerId: 'customer-123',
  subject: 'Kitchen Renovation',
  site: '123 Main St',
  creationDate: new Date().toISOString(),
  status: 'draft',
  taxRate: 19
});

// Retrieve estimate with details
const estimateWithDetails = await estimateService.getEstimateWithDetails(newEstimate.id);

// Add chapters and line items (using chapter and line item repositories directly or through additional service methods)
// ... 

// Calculate totals
const total = estimateService.calculateEstimateTotal(estimateWithDetails);

// Update estimate header
await estimateService.updateEstimateHeader(newEstimate.id, { status: 'issued' });

// Duplicate estimate
const duplicatedEstimate = await estimateService.duplicateEstimate(newEstimate.id);

// Delete estimate (and all its children)
await estimateService.deleteEstimate(newEstimate.id);
```

## Notes
- The service assumes that chapters and line items are managed through their respective repository functions directly. For a more encapsulated approach, additional service methods could be added for chapter and line item operations.
- Estimate number generation is optimistic and assumes no concurrent requests (suitable for a desktop application).
- All monetary calculations use the pre-stored `amount` field in line items (quantity × unitPrice).
- The service does not handle PDF generation as requested.