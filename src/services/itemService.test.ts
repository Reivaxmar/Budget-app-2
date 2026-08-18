import { describe, it, expect, beforeEach } from 'vitest';
import { createLineItemFromItem, searchItems } from './itemService';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { lineItemRepositoryClient } from '../db/estimateRepositoryClient';
import type { Item } from '../domain/models';

describe('createLineItemFromItem', () => {
  const baseItem: Item = {
    id: 'item-1',
    code: 'BRK-001',
    description: 'Red brick, standard size',
    unit: 'pcs',
    defaultPrice: 0.75,
    category: 'Masonry',
    keywords: 'brick red masonry',
  };

  it('copies the relevant catalog values into a line item draft', () => {
    const draft = createLineItemFromItem(baseItem, { quantity: 100, order: 2 });

    expect(draft).toEqual({
      code: 'BRK-001',
      description: 'Red brick, standard size',
      unit: 'pcs',
      quantity: 100,
      unitPrice: 0.75,
      amount: 75,
      order: 2,
    });
  });

  it('defaults quantity to 1 and order to 0 when not provided', () => {
    const draft = createLineItemFromItem(baseItem);

    expect(draft.quantity).toBe(1);
    expect(draft.order).toBe(0);
    expect(draft.amount).toBe(0.75);
  });

  it('does not keep a reference to the source item — mutating the item afterwards leaves the draft untouched', () => {
    const item: Item = { ...baseItem };
    const draft = createLineItemFromItem(item, { quantity: 2 });

    // Simulate a later library edit
    item.description = 'Changed description';
    item.defaultPrice = 999;
    item.code = 'CHANGED';

    expect(draft.description).toBe('Red brick, standard size');
    expect(draft.unitPrice).toBe(0.75);
    expect(draft.code).toBe('BRK-001');
    expect(draft.amount).toBe(1.5);
  });

  it('rounds the computed amount to the nearest cent', () => {
    const item: Item = { ...baseItem, defaultPrice: 0.1 };
    const draft = createLineItemFromItem(item, { quantity: 3 });

    expect(draft.amount).toBe(0.3);
  });
});

describe('searchItems', () => {
  const items: Item[] = [
    {
      id: '1',
      code: 'BRK-001',
      description: 'Red brick, standard size',
      unit: 'pcs',
      defaultPrice: 0.75,
      category: 'Masonry',
      keywords: 'brick red masonry',
    },
    {
      id: '2',
      code: 'CEM-010',
      description: 'Portland cement, 25kg bag',
      unit: 'bag',
      defaultPrice: 8.5,
      category: 'Masonry',
      keywords: 'cement concrete',
    },
    {
      id: '3',
      code: 'ELE-100',
      description: 'PVC conduit, 20mm',
      unit: 'm',
      defaultPrice: 1.2,
      category: 'Electrical',
      keywords: 'conduit wiring',
    },
  ];

  it('returns all items when the search term is empty', () => {
    expect(searchItems(items, '')).toEqual(items);
    expect(searchItems(items, '   ')).toEqual(items);
  });

  it('matches by code, description, category or keywords, case-insensitively', () => {
    expect(searchItems(items, 'brk-001')).toEqual([items[0]]);
    expect(searchItems(items, 'cement')).toEqual([items[1]]);
    expect(searchItems(items, 'ELECTRICAL')).toEqual([items[2]]);
    expect(searchItems(items, 'masonry')).toEqual([items[0], items[1]]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchItems(items, 'nonexistent')).toEqual([]);
  });
});

describe('item library changes do not affect estimates that already used them', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('leaves a previously created line item unchanged after the source item is edited or deleted', async () => {
    const item = await itemRepositoryClient.create({
      code: 'BRK-001',
      description: 'Red brick, standard size',
      unit: 'pcs',
      defaultPrice: 0.75,
      category: 'Masonry',
      keywords: 'brick red masonry',
    });

    const draft = createLineItemFromItem(item, { quantity: 100, order: 1 });
    const lineItem = await lineItemRepositoryClient.create({
      ...draft,
      chapterId: 'chapter-1',
    });

    // Later library changes: price/description update, then deletion
    await itemRepositoryClient.update(item.id, {
      description: 'Premium red brick',
      defaultPrice: 1.5,
    });
    await itemRepositoryClient.delete(item.id);

    const persisted = await lineItemRepositoryClient.findById(lineItem.id);
    expect(persisted).not.toBeNull();
    expect(persisted?.description).toBe('Red brick, standard size');
    expect(persisted?.unitPrice).toBe(0.75);
    expect(persisted?.amount).toBe(75);

    const stillInLibrary = await itemRepositoryClient.findById(item.id);
    expect(stillInLibrary).toBeNull();
  });
});
