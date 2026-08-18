import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import { Customer } from '../domain/models';
import { notify } from '../notifications';
import './CustomersPage.css';

const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
    notes: '',
  });

  // Load customers from the database
  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerRepositoryClient.findMany();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError(t('customers.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Handle search term change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle form input change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Open form for creating a new customer
  const handleCreateCustomer = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      taxId: '',
      notes: '',
    });
    setFormVisible(true);
  };

  // Open form for editing an existing customer
  const handleEditCustomer = (customer: Customer) => {
    setIsEditing(true);
    setFormData({
      name: customer.name,
      address: customer.address,
      phone: customer.phone,
      email: customer.email,
      taxId: customer.taxId,
      notes: customer.notes,
    });
    setSelectedCustomer(customer);
    setFormVisible(true);
  };

  // Handle form submission (create or update)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.name || !formData.address || !formData.email) {
      notify(t('customers.errors.requiredFields'), 'error');
      return;
    }
    // Optional: simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      notify(t('customers.errors.invalidEmail'), 'error');
      return;
    }

    try {
      if (isEditing && selectedCustomer) {
        // Update existing customer
        await customerRepositoryClient.update(selectedCustomer.id, formData as Partial<Omit<Customer, 'id'>>);
      } else {
        // Create new customer
        await customerRepositoryClient.create(formData as Omit<Customer, 'id'>);
      }
      // Close form and reload list
      setFormVisible(false);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to save customer:', err);
      notify(t('customers.errors.saveFailed'), 'error');
    }
  };

  // Handle deleting a customer
  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm(t('customers.confirmDelete'))) {
      try {
        await customerRepositoryClient.delete(id);
        await loadCustomers();
      } catch (err) {
        console.error('Failed to delete customer:', err);
        notify(t('customers.errors.deleteFailed'), 'error');
      }
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      customer.address.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      (customer.phone && customer.phone.toLowerCase().includes(term)) ||
      (customer.taxId && customer.taxId.toLowerCase().includes(term)) ||
      (customer.notes && customer.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="customers-page">
      <h1>{t('customers.title')}</h1>
      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder={t('customers.searchPlaceholder')}
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        <button onClick={handleCreateCustomer} className="add-button">
          {t('customers.addButton')}
        </button>
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading state */}
      {loading && <p>{t('customers.loading')}</p>}

      {/* Customers table */}
      {!loading && (
        <table>
          <thead>
            <tr>
              <th>{t('customers.fields.name')}</th>
              <th>{t('customers.fields.address')}</th>
              <th>{t('customers.fields.email')}</th>
              <th>{t('customers.fields.phone')}</th>
              <th>{t('customers.fields.taxId')}</th>
              <th>{t('customers.fields.notes')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-customers">
                  {t('customers.noneFound')}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.address}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone || ''}</td>
                  <td>{customer.taxId || ''}</td>
                  <td>{customer.notes || ''}</td>
                  <td>
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      className="actions-button"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="delete-button"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Customer Form Modal */}
      {formVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{isEditing ? t('customers.editCustomer') : t('customers.addCustomer')}</h2>
            <form onSubmit={handleSaveCustomer} className="customer-form">
              <div className="form-group">
                <label>
                  {t('customers.fields.name')}:
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('customers.fields.address')}:
                  <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('customers.fields.email')}:
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('customers.fields.phone')}:
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleFormChange}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('customers.fields.taxId')}:
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId || ''}
                    onChange={handleFormChange}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('customers.fields.notes')}:
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleFormChange}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setFormVisible(false)}
                  className="cancel-button"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="submit-button">
                  {isEditing ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
