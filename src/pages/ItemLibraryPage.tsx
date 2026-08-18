import React, { useState, useEffect } from 'react';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { searchItems } from '../services/itemService';
import { Item } from '../domain/models';
import './ItemLibraryPage.css';

const emptyFormData: Partial<Item> = {
  code: '',
  description: '',
  unit: '',
  defaultPrice: 0,
  category: '',
  keywords: '',
};

const ItemLibraryPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<Item>>(emptyFormData);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await itemRepositoryClient.findMany();
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'defaultPrice' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCreateItem = () => {
    setIsEditing(false);
    setSelectedItem(null);
    setFormData(emptyFormData);
    setFormVisible(true);
  };

  const handleEditItem = (item: Item) => {
    setIsEditing(true);
    setSelectedItem(item);
    setFormData({
      code: item.code,
      description: item.description,
      unit: item.unit,
      defaultPrice: item.defaultPrice,
      category: item.category,
      keywords: item.keywords,
    });
    setFormVisible(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.unit) {
      alert('Description and unit are required.');
      return;
    }

    try {
      if (isEditing && selectedItem) {
        await itemRepositoryClient.update(
          selectedItem.id,
          formData as Partial<Omit<Item, 'id'>>
        );
      } else {
        await itemRepositoryClient.create(formData as Omit<Item, 'id'>);
      }
      setFormVisible(false);
      await loadItems();
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Failed to save item. Please try again.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await itemRepositoryClient.delete(id);
        await loadItems();
      } catch (err) {
        console.error('Failed to delete item:', err);
        alert('Failed to delete item. Please try again.');
      }
    }
  };

  const filteredItems = searchItems(items, searchTerm);

  return (
    <div className="item-library-page">
      <h1>Item Library</h1>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search items by code, description, category or keywords..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        <button onClick={handleCreateItem} className="add-button">
          Add Item
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <p>Loading items...</p>}

      {!loading && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Unit</th>
                <th>Default Price</th>
                <th>Category</th>
                <th>Keywords</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-items">
                    No items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.description}</td>
                    <td>{item.unit}</td>
                    <td>{item.defaultPrice.toFixed(2)}</td>
                    <td>{item.category}</td>
                    <td>{item.keywords}</td>
                    <td>
                      <button
                        onClick={() => handleEditItem(item)}
                        className="actions-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {formVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{isEditing ? 'Edit Item' : 'Add Item'}</h2>
            <form onSubmit={handleSaveItem} className="item-form">
              <div className="form-group">
                <label>
                  Code:
                  <input
                    type="text"
                    name="code"
                    value={formData.code || ''}
                    onChange={handleFormChange}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Description:
                  <input
                    type="text"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Unit:
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit || ''}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Default Price:
                  <input
                    type="number"
                    name="defaultPrice"
                    value={formData.defaultPrice ?? 0}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Category:
                  <input
                    type="text"
                    name="category"
                    value={formData.category || ''}
                    onChange={handleFormChange}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Keywords:
                  <input
                    type="text"
                    name="keywords"
                    value={formData.keywords || ''}
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
                  Cancel
                </button>
                <button type="submit" className="submit-button">
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

export default ItemLibraryPage;
