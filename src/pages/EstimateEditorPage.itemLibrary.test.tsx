import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import EstimateEditorPage from './EstimateEditorPage';
import {
  chapterRepositoryClient,
  lineItemRepositoryClient,
  estimateRepositoryClient,
} from '../db/estimateRepositoryClient';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { Estimate, Chapter, Item } from '../domain/models';
import '@testing-library/jest-dom';

vi.mock('../db/estimateRepositoryClient');
vi.mock('../db/customerRepositoryClient');
vi.mock('../db/itemRepositoryClient');

describe('EstimateEditorPage — insert from library', () => {
  const estimate: Estimate = {
    id: 'estimate-1',
    estimateNumber: '001-26',
    year: 2026,
    customerId: 'customer-1',
    subject: 'Test subject',
    site: 'Test site',
    creationDate: new Date('2026-01-01').toISOString(),
    status: 'draft',
    taxRate: 0,
    introduction: '',
    templateId: 'template-1',
    finalNoteTitle: '',
    finalNoteContent: '',
  };

  const chapter: Chapter = {
    id: 'chapter-1',
    estimateId: estimate.id,
    title: 'Chapter 1',
    order: 1,
  };

  const libraryItem: Item = {
    id: 'item-1',
    code: 'BRK-001',
    description: 'Red brick, standard size',
    unit: 'pcs',
    defaultPrice: 0.75,
    category: 'Masonry',
    keywords: 'brick red masonry',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(estimateRepositoryClient.findById).mockResolvedValue(estimate);
    vi.mocked(chapterRepositoryClient.findByEstimateId).mockResolvedValue([chapter]);
    vi.mocked(lineItemRepositoryClient.findByChapterId).mockResolvedValue([]);
    vi.mocked(customerRepositoryClient.findMany).mockResolvedValue([]);
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue([libraryItem]);
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={[`/estimates/${estimate.id}/edit`]}>
        <Routes>
          <Route path="/estimates/:id/edit" element={<EstimateEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('fills the line item form with a copy of the library item and persists that copy, independent of later library edits', async () => {
    vi.mocked(lineItemRepositoryClient.create).mockResolvedValue({
      id: 'line-item-1',
      chapterId: chapter.id,
      code: libraryItem.code,
      description: libraryItem.description,
      unit: libraryItem.unit,
      quantity: 10,
      unitPrice: libraryItem.defaultPrice,
      amount: 7.5,
      order: 1,
    });

    renderPage();

    // Open the "Add Line Item" modal for the chapter
    await waitFor(() => expect(screen.getByText('1. Chapter 1')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add line item/i }));

    // Search the library and insert the item
    const librarySearch = screen.getByPlaceholderText(/search library items/i);
    fireEvent.change(librarySearch, { target: { value: 'brick' } });
    const suggestion = await screen.findByRole('button', {
      name: /BRK-001.*Red brick, standard size/i,
    });
    fireEvent.click(suggestion);

    // Form fields should now contain a copy of the library item's values
    expect(screen.getByLabelText(/^code:/i)).toHaveValue(libraryItem.code);
    expect(screen.getByLabelText(/^description:/i)).toHaveValue(libraryItem.description);
    expect(screen.getByLabelText(/^unit:/i)).toHaveValue(libraryItem.unit);
    expect(screen.getByLabelText(/^unit price:/i)).toHaveValue(libraryItem.defaultPrice);

    // Adjust quantity, then save — this is what gets persisted. The line
    // item form's Create button is a plain type="button" wired to an
    // onClick handler (not a form submit), so a direct click is fine here.
    fireEvent.change(screen.getByLabelText(/^quantity:/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(lineItemRepositoryClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chapterId: chapter.id,
          code: libraryItem.code,
          description: libraryItem.description,
          unit: libraryItem.unit,
          unitPrice: libraryItem.defaultPrice,
          quantity: 10,
        })
      );
    });

    // Simulate a later library change — this must not retroactively change
    // the line item that already copied the old values.
    const persistedCallArgs = vi.mocked(lineItemRepositoryClient.create).mock.calls[0][0];
    await itemRepositoryClient.update(libraryItem.id, {
      description: 'Premium brick',
      defaultPrice: 999,
    });

    expect(persistedCallArgs.description).toBe('Red brick, standard size');
    expect(persistedCallArgs.unitPrice).toBe(0.75);
  });
});
