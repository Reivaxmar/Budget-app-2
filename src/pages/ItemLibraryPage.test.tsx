import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ItemLibraryPage from './ItemLibraryPage';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { notify } from '../notifications';
import { Item } from '../domain/models';
import '@testing-library/jest-dom';

// Mock the actual repository module ItemLibraryPage imports
vi.mock('../db/itemRepositoryClient');
vi.mock('../notifications');

describe('ItemLibraryPage', () => {
  const mockItems: Item[] = [
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the item list after loading', async () => {
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue(mockItems);

    render(<ItemLibraryPage />);

    expect(await screen.findByText('Red brick, standard size')).toBeInTheDocument();
    expect(screen.getByText('Portland cement, 25kg bag')).toBeInTheDocument();
    expect(screen.queryByText(/loading items/i)).not.toBeInTheDocument();
  });

  it('filters items by search term across code, description, category and keywords', async () => {
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue(mockItems);

    render(<ItemLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText('Red brick, standard size')).toBeInTheDocument()
    );

    const searchInput = screen.getByPlaceholderText(/search items/i);
    fireEvent.change(searchInput, { target: { value: 'cement' } });

    expect(await screen.findByText('Portland cement, 25kg bag')).toBeInTheDocument();
    expect(screen.queryByText('Red brick, standard size')).not.toBeInTheDocument();
  });

  it('creates a new item when the form is submitted with valid data', async () => {
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue([]);
    vi.mocked(itemRepositoryClient.create).mockResolvedValue({
      id: 'new-id',
      code: 'NEW-1',
      description: 'New Item',
      unit: 'pcs',
      defaultPrice: 3.5,
      category: 'General',
      keywords: 'new',
    });

    const { container } = render(<ItemLibraryPage />);
    await waitFor(() =>
      expect(screen.queryByText(/loading items/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /add item/i }));

    fireEvent.change(screen.getByLabelText(/code:/i), { target: { value: 'NEW-1' } });
    fireEvent.change(screen.getByLabelText(/description:/i), {
      target: { value: 'New Item' },
    });
    fireEvent.change(screen.getByLabelText(/unit:/i), { target: { value: 'pcs' } });
    fireEvent.change(screen.getByLabelText(/default price:/i), {
      target: { value: '3.5' },
    });

    // Submit the form directly rather than clicking the submit button:
    // happy-dom mis-evaluates step-mismatch validity for decimal values
    // (e.g. 3.5 with step="0.01"), which would otherwise silently block
    // the native click-triggered submission before React's onSubmit runs.
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(itemRepositoryClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NEW-1',
          description: 'New Item',
          unit: 'pcs',
          defaultPrice: 3.5,
        })
      );
    });
  });

  it('rejects submission when description or unit is missing', async () => {
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue([]);

    const { container } = render(<ItemLibraryPage />);
    await waitFor(() =>
      expect(screen.queryByText(/loading items/i)).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /add item/i }));
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(itemRepositoryClient.create).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('edits an existing item', async () => {
    const existing = mockItems[0];
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue([existing]);
    vi.mocked(itemRepositoryClient.update).mockResolvedValue({
      ...existing,
      defaultPrice: 1.1,
    });

    const { container } = render(<ItemLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText('Red brick, standard size')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/default price:/i), {
      target: { value: '1.1' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(itemRepositoryClient.update).toHaveBeenCalledWith(
        existing.id,
        expect.objectContaining({ defaultPrice: 1.1 })
      );
    });
  });

  it('deletes an item after confirmation', async () => {
    const existing = mockItems[0];
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue([existing]);
    vi.mocked(itemRepositoryClient.delete).mockResolvedValue(undefined);
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<ItemLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText('Red brick, standard size')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(itemRepositoryClient.delete).toHaveBeenCalledWith(existing.id);
    });
    window.confirm = originalConfirm;
  });
});
