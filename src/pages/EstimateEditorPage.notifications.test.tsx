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
import { appSettingsRepositoryClient } from '../db/appSettingsRepositoryClient';
import { notify } from '../notifications';
import { Estimate, Chapter, Customer } from '../domain/models';
import '@testing-library/jest-dom';

vi.mock('../db/estimateRepositoryClient');
vi.mock('../db/customerRepositoryClient');
vi.mock('../db/itemRepositoryClient');
vi.mock('../db/appSettingsRepositoryClient');
vi.mock('../notifications');

describe('EstimateEditorPage — inline customer creation and single save notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(itemRepositoryClient.findMany).mockResolvedValue([]);
    vi.mocked(appSettingsRepositoryClient.get).mockResolvedValue({ defaultTaxRate: 0 });
  });

  describe('adding a customer inline (no customer selected)', () => {
    beforeEach(() => {
      vi.mocked(customerRepositoryClient.findMany).mockResolvedValue([]);
    });

    const renderNewEstimate = () =>
      render(
        <MemoryRouter initialEntries={['/estimates/new']}>
          <Routes>
            <Route path="/estimates/new" element={<EstimateEditorPage />} />
          </Routes>
        </MemoryRouter>
      );

    it('shows an "Add Customer" button next to the select only while no customer is chosen', async () => {
      renderNewEstimate();

      expect(await screen.findByRole('button', { name: /^add customer$/i })).toBeInTheDocument();
    });

    it('creates the customer, selects it, and hides the button once one is chosen', async () => {
      const created: Customer = {
        id: 'customer-new',
        name: 'Marta Puig',
        address: 'Carrer de Mallorca 245',
        phone: '',
        email: 'marta@example.com',
        taxId: '',
        notes: '',
      };
      vi.mocked(customerRepositoryClient.create).mockResolvedValue(created);

      renderNewEstimate();

      fireEvent.click(await screen.findByRole('button', { name: /^add customer$/i }));

      // The inline modal has its own Name/Address/Email fields.
      fireEvent.change(screen.getByLabelText(/^name:/i), { target: { value: created.name } });
      fireEvent.change(screen.getByLabelText(/^address:/i), { target: { value: created.address } });
      fireEvent.change(screen.getByLabelText(/^email:/i), { target: { value: created.email } });
      fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(customerRepositoryClient.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: created.name, address: created.address, email: created.email })
        );
      });

      // Modal closes and the new customer is now selected, so the button disappears.
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /^add customer$/i })).not.toBeInTheDocument();
      });
      expect(screen.getByLabelText(/^customer:/i)).toHaveValue(created.id);
    });
  });

  describe('clicking "Save Estimate"', () => {
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
      templateOverrides: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const chapter: Chapter = {
      id: 'chapter-1',
      estimateId: estimate.id,
      title: 'Chapter 1',
      order: 1,
    };

    beforeEach(() => {
      vi.mocked(estimateRepositoryClient.findById).mockResolvedValue(estimate);
      vi.mocked(estimateRepositoryClient.update).mockResolvedValue(estimate);
      vi.mocked(chapterRepositoryClient.findByEstimateId).mockResolvedValue([chapter]);
      vi.mocked(lineItemRepositoryClient.findByChapterId).mockResolvedValue([]);
      vi.mocked(customerRepositoryClient.findMany).mockResolvedValue([]);
    });

    it('shows exactly one success toast, not both "header saved" and "estimate saved"', async () => {
      render(
        <MemoryRouter initialEntries={[`/estimates/${estimate.id}/edit`]}>
          <Routes>
            <Route path="/estimates/:id/edit" element={<EstimateEditorPage />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole('button', { name: /^save estimate$/i }));

      await waitFor(() => {
        expect(estimateRepositoryClient.update).toHaveBeenCalled();
      });

      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(expect.stringMatching(/estimate saved/i), 'success');
    });
  });
});
