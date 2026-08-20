import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import EstimatesListPage from './EstimatesListPage';
import { estimateRepositoryClient } from '../db/estimateRepositoryClient';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import type { Estimate, Customer } from '../domain/models';
import '@testing-library/jest-dom';

vi.mock('../db/estimateRepositoryClient');
vi.mock('../db/customerRepositoryClient');

function makeEstimate(overrides: Partial<Estimate>): Estimate {
  return {
    id: 'estimate-1',
    estimateNumber: '001-26',
    year: 2026,
    customerId: 'customer-1',
    subject: 'Subject',
    site: '',
    creationDate: '2026-01-01T00:00:00.000Z',
    status: 'draft',
    taxRate: 0,
    introduction: '',
    templateId: 'template-1',
    finalNoteTitle: '',
    finalNoteContent: '',
    templateOverrides: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const customers: Customer[] = [
  { id: 'customer-1', name: 'Alice', address: '', phone: '', email: '', taxId: '', notes: '' },
  { id: 'customer-2', name: 'Bob', address: '', phone: '', email: '', taxId: '', notes: '' },
];

describe('EstimatesListPage', () => {
  const older = makeEstimate({
    id: 'e-older',
    estimateNumber: '001-26',
    subject: 'Kitchen renovation',
    customerId: 'customer-1',
    creationDate: '2026-01-05T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z',
  });
  const newer = makeEstimate({
    id: 'e-newer',
    estimateNumber: '002-26',
    subject: 'Bathroom remodel',
    customerId: 'customer-2',
    creationDate: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(customerRepositoryClient.findMany).mockResolvedValue(customers);
    vi.mocked(estimateRepositoryClient.findMany).mockResolvedValue([older, newer]);
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <EstimatesListPage />
      </MemoryRouter>
    );

  it('orders estimates by last edit (most recently updated first), regardless of creation date', async () => {
    renderPage();

    const rows = await screen.findAllByRole('row');
    // rows[0] is the header row
    expect(rows[1]).toHaveTextContent('Bathroom remodel');
    expect(rows[2]).toHaveTextContent('Kitchen renovation');
  });

  it('searches by subject, case-insensitively', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Kitchen renovation')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/search by subject/i), {
      target: { value: 'BATHROOM' },
    });

    expect(screen.getByText('Bathroom remodel')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen renovation')).not.toBeInTheDocument();
  });

  it('filters by customer', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Kitchen renovation')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/customer:/i), { target: { value: 'customer-2' } });

    expect(screen.getByText('Bathroom remodel')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen renovation')).not.toBeInTheDocument();
  });

  it('filters by a creation-date range', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Kitchen renovation')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/from:/i), { target: { value: '2026-02-01' } });

    expect(screen.getByText('Bathroom remodel')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen renovation')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/to:/i), { target: { value: '2026-02-05' } });

    expect(screen.queryByText('Bathroom remodel')).not.toBeInTheDocument();
  });

  it('shows a "no matches" message distinct from the empty-list message when filters exclude everything', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Kitchen renovation')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/search by subject/i), {
      target: { value: 'nonexistent subject' },
    });

    expect(await screen.findByText(/no estimates match/i)).toBeInTheDocument();
  });
});
