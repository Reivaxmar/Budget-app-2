import React, { useState, useEffect } from 'react';
import { customerRepositoryClient } from '../db/customerRepositoryClient';
import { Customer } from '../domain/models';

const CustomersPage: React.FC = () => {
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
      setError('Failed to load customers. Please try again.');
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
      alert('Name, address, and email are required.');
      return;
    }
    // Optional: simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      alert('Please enter a valid email address.');
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
      alert('Failed to save customer. Please try again.');
    }
  };

  // Handle deleting a customer
  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerRepositoryClient.delete(id);
        await loadCustomers();
      } catch (err) {
        console.error('Failed to delete customer:', err);
        alert('Failed to delete customer. Please try again.');
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
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '1rem' }}>
      <h1>Customers</h1>
      {/* Search bar */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ padding: '0.5rem', width: '300px' }}
        />
        <button onClick={handleCreateCustomer} style={{ marginLeft: '0.5rem' }}>
          Add Customer
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '0.5rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && <p>Loading customers...</p>}

      {/* Customers table */}
      {!loading && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Address</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Tax ID</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Notes</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '1rem' }}>
                  No customers found.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>{customer.name}</td>
                  <td style={{ padding: '0.5rem' }}>{customer.address}</td>
                  <td style={{ padding: '0.5rem' }}>{customer.email}</td>
                  <td style={{ padding: '0.5rem' }}>{customer.phone || ''}</td>
                  <td style={{ padding: '0.5rem' }}>{customer.taxId || ''}</td>
                  <td style={{ padding: '0.5rem' }}>{customer.notes || ''}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      style={{ marginRight: '0.5rem' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer.id)}
                      style={{ backgroundColor: '#ffebee', color: '#c62828' }}
                    >
                      Delete
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <h2>{isEditing ? 'Edit Customer' : 'Add Customer'}</h2>
            <form onSubmit={handleSaveCustomer} style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label>
                  Name:
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleFormChange}
                    required
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>
                  Address:
                  <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleFormChange}
                    required
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>
                  Email:
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleFormChange}
                    required
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>
                  Phone:
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>
                  Tax ID:
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId || ''}
                    onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>
                  Notes:
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleFormChange}
                    style={{ width: '100%', height: '80px', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </label>
              </div>
              <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFormVisible(false)}
                  style={{ marginRight: '0.5rem' }}
                >
                  Cancel
                </button>
                <button type="submit">
                  {isEditing ? 'Update' : 'Create'}
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