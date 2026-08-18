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

export const itemService = {
  createItem: itemRepositoryClient.create,
  updateItem: itemRepositoryClient.update,
  deleteItem: itemRepositoryClient.delete,
  findItems: itemRepositoryClient.findMany,
  createLineItemFromItem,
  searchItems,
};
