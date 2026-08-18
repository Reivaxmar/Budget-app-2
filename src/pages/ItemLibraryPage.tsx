import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { searchItems } from '../services/itemService';
import { Item } from '../domain/models';
import { notify } from '../notifications';
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
  const { t } = useTranslation();
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
      setError(t('itemLibrary.errors.loadFailed'));
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
      notify(t('itemLibrary.errors.requiredFields'), 'error');
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
      notify(t('itemLibrary.errors.saveFailed'), 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm(t('itemLibrary.confirmDelete'))) {
      try {
        await itemRepositoryClient.delete(id);
        await loadItems();
      } catch (err) {
        console.error('Failed to delete item:', err);
        notify(t('itemLibrary.errors.deleteFailed'), 'error');
      }
    }
  };

  const filteredItems = searchItems(items, searchTerm);

  return (
    <div className="item-library-page">
      <h1>{t('itemLibrary.title')}</h1>

      <div className="search-bar">
        <input
          type="text"
          placeholder={t('itemLibrary.searchPlaceholder')}
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        <button onClick={handleCreateItem} className="add-button">
          {t('itemLibrary.addButton')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <p>{t('itemLibrary.loading')}</p>}

      {!loading && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('itemLibrary.fields.code')}</th>
                <th>{t('itemLibrary.fields.description')}</th>
                <th>{t('itemLibrary.fields.unit')}</th>
                <th>{t('itemLibrary.fields.defaultPrice')}</th>
                <th>{t('itemLibrary.fields.category')}</th>
                <th>{t('itemLibrary.fields.keywords')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-items">
                    {t('itemLibrary.noneFound')}
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
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
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
        </div>
      )}

      {formVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{isEditing ? t('itemLibrary.editItem') : t('itemLibrary.addItem')}</h2>
            <form onSubmit={handleSaveItem} className="item-form">
              <div className="form-group">
                <label>
                  {t('itemLibrary.fields.code')}:
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
                  {t('itemLibrary.fields.description')}:
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
                  {t('itemLibrary.fields.unit')}:
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
                  {t('itemLibrary.fields.defaultPrice')}:
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
                  {t('itemLibrary.fields.category')}:
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
                  {t('itemLibrary.fields.keywords')}:
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

export default ItemLibraryPage;
