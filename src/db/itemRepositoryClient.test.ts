import { describe, it, expect, beforeEach } from 'vitest';
import { itemRepositoryClient } from './itemRepositoryClient';

describe('itemRepositoryClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates an item and assigns an id', async () => {
    const created = await itemRepositoryClient.create({
      code: 'BRK-001',
      description: 'Red brick',
      unit: 'pcs',
      defaultPrice: 0.75,
      categoryId: 'category-1',
      keywords: 'brick',
    });

    expect(created.id).toBeTruthy();
    expect(created.description).toBe('Red brick');
  });

  it('persists items across findMany calls', async () => {
    await itemRepositoryClient.create({
      code: 'A',
      description: 'Item A',
      unit: 'pcs',
      defaultPrice: 1,
      categoryId: '',
      keywords: '',
    });
    await itemRepositoryClient.create({
      code: 'B',
      description: 'Item B',
      unit: 'pcs',
      defaultPrice: 2,
      categoryId: '',
      keywords: '',
    });

    const items = await itemRepositoryClient.findMany();
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.code).sort()).toEqual(['A', 'B']);
  });

  it('finds an item by id, returning null when not found', async () => {
    const created = await itemRepositoryClient.create({
      code: 'A',
      description: 'Item A',
      unit: 'pcs',
      defaultPrice: 1,
      categoryId: '',
      keywords: '',
    });

    expect(await itemRepositoryClient.findById(created.id)).toEqual(created);
    expect(await itemRepositoryClient.findById('missing')).toBeNull();
  });

  it('updates an item in place without changing its id', async () => {
    const created = await itemRepositoryClient.create({
      code: 'A',
      description: 'Item A',
      unit: 'pcs',
      defaultPrice: 1,
      categoryId: '',
      keywords: '',
    });

    const updated = await itemRepositoryClient.update(created.id, {
      description: 'Updated description',
      defaultPrice: 5,
    });

    expect(updated.id).toBe(created.id);
    expect(updated.description).toBe('Updated description');
    expect(updated.defaultPrice).toBe(5);
    expect(updated.code).toBe('A');
  });

  it('throws when updating an item that does not exist', async () => {
    await expect(
      itemRepositoryClient.update('missing', { description: 'x' })
    ).rejects.toThrow();
  });

  it('deletes an item', async () => {
    const created = await itemRepositoryClient.create({
      code: 'A',
      description: 'Item A',
      unit: 'pcs',
      defaultPrice: 1,
      categoryId: '',
      keywords: '',
    });

    await itemRepositoryClient.delete(created.id);

    expect(await itemRepositoryClient.findById(created.id)).toBeNull();
    expect(await itemRepositoryClient.findMany()).toHaveLength(0);
  });
});
