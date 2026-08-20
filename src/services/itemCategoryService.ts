import { itemCategoryRepositoryClient } from '../db/itemCategoryRepositoryClient';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import type { ItemCategory } from '../domain/models';

const MISC_CATEGORY_NAME = 'misc';

// ensureMiscCategorySeeded is reached independently from several places on
// mount; without this in-flight guard, two calls that both see an empty
// category list before either finishes creating "misc" would each seed one,
// leaving two categories both claiming order 1 (see templateService's
// getDefaultTemplate for the same pattern).
let pendingMiscSeed: Promise<ItemCategory> | null = null;

async function ensureMiscCategorySeeded(): Promise<ItemCategory> {
  const categories = await itemCategoryRepositoryClient.findMany();
  if (categories.length > 0) {
    return categories.slice().sort((a, b) => a.order - b.order)[0];
  }

  if (!pendingMiscSeed) {
    pendingMiscSeed = itemCategoryRepositoryClient
      .create({ name: MISC_CATEGORY_NAME, order: 1 })
      .finally(() => {
        pendingMiscSeed = null;
      });
  }
  return pendingMiscSeed;
}

/**
 * Lists all item categories, ordered by creation order (misc first), seeding
 * the built-in "misc" category on first use so there is always at least one
 * to assign new items to.
 */
export async function listItemCategories(): Promise<ItemCategory[]> {
  const categories = await itemCategoryRepositoryClient.findMany();
  if (categories.length === 0) {
    return [await ensureMiscCategorySeeded()];
  }
  return categories.slice().sort((a, b) => a.order - b.order);
}

/** The category new items fall back to when none is explicitly chosen. */
export async function getDefaultItemCategory(): Promise<ItemCategory> {
  const categories = await listItemCategories();
  return categories[0];
}

/**
 * Creates a new item category, assigning it the next creation-order number
 * (1 for the first ever category, i.e. "misc", incrementing from there).
 * This order is what forms the "XXX" part of item codes in that category —
 * see itemService.generateItemCode — and never changes afterwards.
 */
export async function createItemCategory(name: string): Promise<ItemCategory> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Category name is required.');
  }

  const categories = await listItemCategories();
  const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.order)) + 1 : 1;
  return itemCategoryRepositoryClient.create({ name: trimmed, order: nextOrder });
}

/** Renames a category in place. Its order (and therefore existing items' codes) is untouched. */
export async function renameItemCategory(id: string, name: string): Promise<ItemCategory> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Category name is required.');
  }
  return itemCategoryRepositoryClient.update(id, { name: trimmed });
}

/**
 * Deletes an item category. Refused when it's the only remaining category
 * (there must always be one to assign items to) or when any item still
 * references it (so no item is ever left pointing at a category that no
 * longer exists).
 */
export async function deleteItemCategory(id: string): Promise<void> {
  const categories = await itemCategoryRepositoryClient.findMany();
  if (!categories.some((category) => category.id === id)) {
    return;
  }

  if (categories.length === 1) {
    throw new Error('Cannot delete the only remaining item category.');
  }

  const items = await itemRepositoryClient.findMany();
  if (items.some((item) => item.categoryId === id)) {
    throw new Error('Cannot delete a category that is still used by items.');
  }

  await itemCategoryRepositoryClient.delete(id);
}

export const itemCategoryService = {
  listItemCategories,
  getDefaultItemCategory,
  createItemCategory,
  renameItemCategory,
  deleteItemCategory,
};
