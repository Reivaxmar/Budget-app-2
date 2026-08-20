import { describe, it, expect, beforeEach } from 'vitest';
import {
  createItemCategory,
  deleteItemCategory,
  listItemCategories,
  renameItemCategory,
} from './itemCategoryService';
import { itemRepositoryClient } from '../db/itemRepositoryClient';

describe('itemCategoryService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('listItemCategories', () => {
    it('seeds the built-in "misc" category (order 1) on first use', async () => {
      const categories = await listItemCategories();

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('misc');
      expect(categories[0].order).toBe(1);
    });

    it('seeds only one "misc" category when called concurrently', async () => {
      const [first, second] = await Promise.all([listItemCategories(), listItemCategories()]);

      expect(second[0].id).toBe(first[0].id);
      expect(await listItemCategories()).toHaveLength(1);
    });

    it('returns categories ordered by creation order', async () => {
      await listItemCategories(); // seeds misc (order 1)
      await createItemCategory('Electrical');
      await createItemCategory('Plumbing');

      const categories = await listItemCategories();
      expect(categories.map((c) => c.name)).toEqual(['misc', 'Electrical', 'Plumbing']);
      expect(categories.map((c) => c.order)).toEqual([1, 2, 3]);
    });
  });

  describe('createItemCategory', () => {
    it('assigns the next creation-order number, starting from misc at 1', async () => {
      const first = await createItemCategory('Electrical');
      expect(first.order).toBe(2); // misc gets seeded as order 1 first

      const second = await createItemCategory('Plumbing');
      expect(second.order).toBe(3);
    });

    it('rejects a blank name', async () => {
      await expect(createItemCategory('   ')).rejects.toThrow();
    });
  });

  describe('renameItemCategory', () => {
    it('renames a category without changing its order', async () => {
      const category = await createItemCategory('Electrical');

      const renamed = await renameItemCategory(category.id, 'Electrical & Data');

      expect(renamed.name).toBe('Electrical & Data');
      expect(renamed.order).toBe(category.order);
    });
  });

  describe('deleteItemCategory', () => {
    it('refuses to delete the only remaining category', async () => {
      const [misc] = await listItemCategories();

      await expect(deleteItemCategory(misc.id)).rejects.toThrow();
      expect(await listItemCategories()).toHaveLength(1);
    });

    it('refuses to delete a category that is still used by an item', async () => {
      const [misc] = await listItemCategories();
      await createItemCategory('Electrical');
      await itemRepositoryClient.create({
        code: '0010001',
        description: 'Some item',
        unit: 'pcs',
        defaultPrice: 1,
        categoryId: misc.id,
        keywords: '',
      });

      await expect(deleteItemCategory(misc.id)).rejects.toThrow();
      expect(await listItemCategories()).toHaveLength(2);
    });

    it('deletes an unused category', async () => {
      await listItemCategories(); // seeds misc
      const electrical = await createItemCategory('Electrical');

      await deleteItemCategory(electrical.id);

      const categories = await listItemCategories();
      expect(categories.map((c) => c.name)).toEqual(['misc']);
    });
  });
});
