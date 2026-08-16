import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CustomerPage from './CustomersPage';
import { customerRepository } from '../db/repository';
import { Customer } from '../domain/models';
import '@testing-library/jest-dom';

// Mock the customerRepository
vi.mock('../db/repository');

describe('CustomersPage', () => {
  const mockCustomers: Array<Omit<Customer, 'id'> & { id: string }> = [
    {
      id: '1',
      name: 'Test Customer 1',
      address: '123 Test St',
      phone: '555-1234',
      email: 'test1@example.com',
      taxId: 'TAX123',
      notes: 'Test notes',
    },
    {
      id: '2',
      name: 'Test Customer 2',
      address: '456 Test Ave',
      phone: '555-5678',
      email: 'test2@example.com',
      taxId: 'TAX456',
      notes: '',
    },
  ] as Customer[];

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('displays loading state initially', async () => {
    // Mock findMany to return a promise that resolves after a delay
    vi.mocked(customerRepository.findMany).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return mockCustomers;
    });

    render(<CustomerPage />);
    // Should show loading text
    expect(await screen.findByText(/loading customers/i)).toBeInTheDocument();
  });

  it('displays customer list after loading', async () => {
    vi.mocked(customerRepository.findMany).mockResolvedValue(mockCustomers);

    render(<CustomerPage />);
    // Wait for loading to finish and customers to appear
    expect(await screen.findByText('Test Customer 1')).toBeInTheDocument();
    expect(await screen.findByText('Test Customer 2')).toBeInTheDocument();
    expect(screen.queryByText(/loading customers/i)).not.toBeInTheDocument();
  });

  it('allows searching customers', async () => {
    vi.mocked(customerRepository.findMany).mockResolvedValue(mockCustomers);

    render(<CustomerPage />);
    await waitFor(() => expect(screen.getByText('Test Customer 1')).toBeInTheDocument());

    // Enter search term
    const searchInput = screen.getByPlaceholderText(/search customers/i);
    fireEvent.change(searchInput, { target: { value: 'Test Customer 2' } });

    // Only the second customer should be visible
    expect(await screen.findByText('Test Customer 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Customer 1')).not.toBeInTheDocument();
  });

  it('opens create customer form when Add Customer button clicked', async () => {
    vi.mocked(customerRepository.findMany).mockResolvedValue([]);

    render(<CustomerPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading customers/i)).not.toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add customer/i });
    fireEvent.click(addButton);

    // Form should appear
    expect(await screen.findByLabelText(/name:/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/address:/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/email:/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('validates required fields when submitting form', async () => {
    vi.mocked(customerRepository.findMany).mockResolvedValue([]);

    render(<CustomerPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading customers/i)).not.toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add customer/i });
    fireEvent.click(addButton);

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    // Should show alert (we can't easily test alert in jsdom, but we can check that no call was made)
    expect(customerRepository.create).not.toHaveBeenCalled();
  });

  it('creates a new customer when form submitted with valid data', async () => {
    const newCustomer: Omit<Customer, 'id'> = {
      name: 'New Customer',
      address: '789 New St',
      phone: '555-0000',
      email: 'new@example.com',
      taxId: 'TAX789',
      notes: 'New notes',
    };
    vi.mocked(customerRepository.findMany).mockResolvedValue([]);
    vi.mocked(customerRepository.create).mockResolvedValue({
      ...newCustomer,
      id: 'new-id',
    });

    render(<CustomerPage />);
    await waitFor(() => {
      expect(screen.queryByText(/loading customers/i)).not.toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add customer/i });
    fireEvent.click(addButton);

    // Fill form
    fireEvent.change(screen.getByLabelText(/name:/i), { target: { value: newCustomer.name } });
    fireEvent.change(screen.getByLabelText(/address:/i), { target: { value: newCustomer.address } });
    fireEvent.change(screen.getByLabelText(/phone:/i), { target: { value: newCustomer.phone } });
    fireEvent.change(screen.getByLabelText(/email:/i), { target: { value: newCustomer.email } });
    fireEvent.change(screen.getByLabelText(/tax id:/i), { target: { value: newCustomer.taxId } });
    fireEvent.change(screen.getByLabelText(/notes:/i), { target: { value: newCustomer.notes } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    // Wait for create to be called
    await waitFor(() => {
      expect(customerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: newCustomer.name,
          address: newCustomer.address,
          email: newCustomer.email,
        })
      );
    });
  });

  it('edits an existing customer when form submitted', async () => {
    const existingCustomer: Customer = {
      id: 'edit-id',
      name: 'Existing Customer',
      address: '123 Old St',
      phone: '555-1111',
      email: 'old@example.com',
      taxId: 'TAX000',
      notes: 'Old notes',
    };
    const updatedData: Partial<Customer> = {
      name: 'Updated Name',
      address: 'Updated Address',
    };
    vi.mocked(customerRepository.findMany).mockResolvedValue([existingCustomer]);
    vi.mocked(customerRepository.update).mockResolvedValue({
      ...existingCustomer,
      ...updatedData,
    });

    render(<CustomerPage />);
    await waitFor(() => {
      expect(screen.getByText('Existing Customer')).toBeInTheDocument();
    });

    // Click edit button for the customer
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Form should appear with existing data
    expect(await screen.findByLabelText(/name:/i)).toHaveValue('Existing Customer');
    expect(await screen.findByLabelText(/address:/i)).toHaveValue('123 Old St');

    // Update form fields
    fireEvent.change(screen.getByLabelText(/name:/i), { target: { value: updatedData.name } });
    fireEvent.change(screen.getByLabelText(/address:/i), { target: { value: updatedData.address } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(submitButton);

    // Wait for update to be called
    await waitFor(() => {
      expect(customerRepository.update).toHaveBeenCalledWith(
        'edit-id',
        expect.objectContaining({
          name: updatedData.name,
          address: updatedData.address,
        })
      );
    });
  });

  it('deletes a customer when delete button clicked and confirmed', async () => {
    const customerToDelete: Customer = {
      id: 'delete-id',
      name: 'To Delete',
      address: '123 Delete St',
      phone: '555-9999',
      email: 'delete@example.com',
      taxId: 'TAXDEL',
      notes: '',
    };
    vi.mocked(customerRepository.findMany).mockResolvedValue([customerToDelete]);
    vi.mocked(customerRepository.delete).mockResolvedValue(undefined);

    render(<CustomerPage />);
    await waitFor(() => {
      expect(screen.getByText('To Delete')).toBeInTheDocument();
    });

    // Mock window.confirm to return true
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    try {
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Wait for delete to be called
      await waitFor(() => {
        expect(customerRepository.delete).toHaveBeenCalledWith('delete-id');
      });
    } finally {
      window.confirm = originalConfirm;
    }
  });
});