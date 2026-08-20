import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { itemCategoryRepositoryClient } from '../db/itemCategoryRepositoryClient';
import { getDefaultItemCategory } from './itemCategoryService';
import type { Item, LineItem } from '../domain/models';

export type CatalogLineItemDraft = Omit<LineItem, 'id' | 'chapterId'>;

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

/**
 * Builds a plain line item draft from a catalog item's current values.
 * The result is a fresh copy (no reference back to the item), so later
 * edits to the library entry never propagate into estimates that already
 * used this data.
 */
export function createLineItemFromItem(
  item: Item,
  options: { quantity?: number; order?: number } = {}
): CatalogLineItemDraft {
  const quantity = options.quantity ?? 1;
  const order = options.order ?? 0;
  const unitPrice = item.defaultPrice;

  return {
    code: item.code,
    description: item.description,
    unit: item.unit,
    quantity,
    unitPrice,
    amount: roundToCents(quantity * unitPrice),
    order,
  };
}

export function searchItems(items: Item[], term: string): Item[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) =>
    [item.code, item.description, item.keywords]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(normalized))
  );
}

/**
 * Generates the next code for a new item in the given category, in the
 * format "XXXYYYY": XXX is the category's creation order (see
 * ItemCategory.order), YYYY is a per-category sequence number that
 * increases by one each time an item is created in that category — mirrors
 * estimateService.generateEstimateNumber's "count existing, take the max +
 * 1" approach.
 */
export async function generateItemCode(categoryId: string): Promise<string> {
  const category = await itemCategoryRepositoryClient.findById(categoryId);
  if (!category) {
    throw new Error(`Item category ${categoryId} not found`);
  }

  const items = await itemRepositoryClient.findMany();
  const sequenceNumbers = items
    .filter((item) => item.categoryId === categoryId)
    .map((item) => {
      const match = item.code.match(/^\d{3}(\d{4})$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => !isNaN(num));

  const nextSequence = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) + 1 : 1;

  const categoryNumber = String(category.order).padStart(3, '0');
  const itemSequence = String(nextSequence).padStart(4, '0');
  return `${categoryNumber}${itemSequence}`;
}

export function findExistingItem(items: Item[], description: string): Item | undefined {
  const normalized = description.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return items.find((item) => item.description.trim().toLowerCase() === normalized);
}

/**
 * Ensures an item with this description exists in the library, creating one
 * from the given draft if it doesn't (auto-generating its code from
 * `categoryId`, or the default "misc" category when none is given). Returns
 * the existing or newly created item, or undefined if the draft has no
 * description to key off of.
 */
export async function ensureItemExists(
  items: Item[],
  draft: { description?: string; unit?: string; unitPrice?: number; categoryId?: string }
): Promise<Item | undefined> {
  const description = draft.description?.trim();
  if (!description) {
    return undefined;
  }

  const existing = findExistingItem(items, description);
  if (existing) {
    return existing;
  }

  const categoryId = draft.categoryId ?? (await getDefaultItemCategory()).id;
  const code = await generateItemCode(categoryId);

  return itemRepositoryClient.create({
    code,
    description,
    unit: draft.unit ?? '',
    defaultPrice: draft.unitPrice ?? 0,
    categoryId,
    keywords: '',
  });
}

export const itemService = {
  createItem: itemRepositoryClient.create,
  updateItem: itemRepositoryClient.update,
  deleteItem: itemRepositoryClient.delete,
  findItems: itemRepositoryClient.findMany,
  createLineItemFromItem,
  searchItems,
  findExistingItem,
  ensureItemExists,
  generateItemCode,
};
