import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { templateService } from '../services/templateService';
import type { Template } from '../domain/models';
import { notify } from '../notifications';
import { closeOnOverlayClick } from '../utils/modal';
import {
  emptyFormState,
  formStateToTemplateData,
  templateToFormState,
  TemplateFormFields,
  TemplateFormState,
} from './TemplateForm';
import './TemplatesPage.css';

const TemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState<TemplateFormState>(emptyFormState());

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensures a built-in default exists so the list is never empty.
      await templateService.getDefaultTemplate();
      const data = await templateService.listTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(t('templates.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateTemplate = () => {
    setEditingId(null);
    setFormData(emptyFormState());
    setFormVisible(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingId(template.id);
    setFormData(templateToFormState(template));
    setFormVisible(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify(t('templates.errors.nameRequired'), 'error');
      return;
    }
    if (!formData.columns.some((column) => column.enabled)) {
      notify(t('templates.errors.columnRequired'), 'error');
      return;
    }

    try {
      const data = formStateToTemplateData(formData);
      if (editingId) {
        await templateService.updateTemplate(editingId, data);
      } else {
        await templateService.createTemplate({ ...data, isDefault: false });
      }
      setFormVisible(false);
      await loadTemplates();
    } catch (err) {
      // Background images are large base64 data URIs — log their length
      // rather than the full string so the console stays readable.
      console.error('Failed to save template:', {
        editingId,
        name: formData.name,
        coverBackgroundImageLength: formData.coverBackgroundImage?.length,
        pageBackgroundImageLength: formData.pageBackgroundImage?.length,
        error: err,
      });
      notify(err instanceof Error ? err.message : t('templates.errors.saveFailed'), 'error');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await templateService.setDefaultTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to set default template:', err);
      notify(err instanceof Error ? err.message : t('templates.errors.setDefaultFailed'), 'error');
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      await templateService.duplicateTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to duplicate template:', err);
      notify(err instanceof Error ? err.message : t('templates.errors.duplicateFailed'), 'error');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm(t('templates.confirmDelete'))) return;
    try {
      await templateService.deleteTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      notify(err instanceof Error ? err.message : t('templates.errors.deleteFailed'), 'error');
    }
  };

  return (
    <div className="templates-page">
      <h1>{t('templates.title')}</h1>
      <p className="templates-intro">{t('templates.intro')}</p>

      <div className="templates-toolbar">
        <button onClick={handleCreateTemplate} className="add-button">
          {t('templates.newTemplate')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && <p>{t('templates.loading')}</p>}

      {!loading && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('templates.table.name')}</th>
                <th>{t('templates.table.default')}</th>
                <th>{t('templates.table.columns')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="no-items">
                    {t('templates.noneFound')}
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>{template.isDefault ? t('templates.table.defaultBadge') : ''}</td>
                    <td>{template.table.columns.map((column) => column.label).join(', ')}</td>
                    <td>
                      <button onClick={() => handleEditTemplate(template)} className="actions-button">
                        {t('common.edit')}
                      </button>
                      {!template.isDefault && (
                        <button
                          onClick={() => handleSetDefault(template.id)}
                          className="actions-button"
                        >
                          {t('templates.actions.setDefault')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicateTemplate(template.id)}
                        className="actions-button"
                      >
                        {t('templates.actions.duplicate')}
                      </button>
                      <button onClick={() => handleDeleteTemplate(template.id)} className="delete-button">
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
        <div className="modal-overlay" onClick={closeOnOverlayClick(() => setFormVisible(false))}>
          <div className="modal-content template-modal-content">
            <h2>{editingId ? t('templates.modal.editTitle') : t('templates.modal.newTitle')}</h2>
            <form onSubmit={handleSaveTemplate} className="template-form">
              <TemplateFormFields formData={formData} setFormData={setFormData} />

              <div className="form-actions">
                <button type="button" onClick={() => setFormVisible(false)} className="cancel-button">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="submit-button">
                  {editingId ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
