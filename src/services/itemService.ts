import { itemRepositoryClient } from '../db/itemRepositoryClient';
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
    [item.code, item.description, item.category, item.keywords]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(normalized))
  );
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
 * from the given draft if it doesn't. Returns the existing or newly created
 * item, or undefined if the draft has no description to key off of.
 */
export async function ensureItemExists(
  items: Item[],
  draft: { code?: string; description?: string; unit?: string; unitPrice?: number }
): Promise<Item | undefined> {
  const description = draft.description?.trim();
  if (!description) {
    return undefined;
  }

  const existing = findExistingItem(items, description);
  if (existing) {
    return existing;
  }

  return itemRepositoryClient.create({
    code: draft.code ?? '',
    description,
    unit: draft.unit ?? '',
    defaultPrice: draft.unitPrice ?? 0,
    category: '',
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
};
