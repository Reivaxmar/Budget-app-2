import React, { useEffect, useState } from 'react';
import { templateService } from '../services/templateService';
import { defaultDocumentTemplate } from '../rendering/templateConfig';
import type { Template, TableColumnKey } from '../domain/models';
import './TemplatesPage.css';

// Structured, constrained template editor (SPECS.md §9). Users configure
// page layout, typography, colors, cover/header/footer toggles, which table
// columns appear (and their label/width/alignment) and final-page wording —
// not a free-form/WYSIWYG canvas. Templates only ever change how an
// estimate is presented; they never carry estimate data.

const FONT_FAMILIES = ['Helvetica', 'Times-Roman', 'Courier'];

const CANONICAL_COLUMNS: Array<{ key: TableColumnKey; defaultLabel: string; defaultWidth: string; defaultAlign: 'left' | 'center' | 'right' }> = [
  { key: 'itemNumber', defaultLabel: 'Item', defaultWidth: '8', defaultAlign: 'left' },
  { key: 'description', defaultLabel: 'Description', defaultWidth: '44', defaultAlign: 'left' },
  { key: 'unit', defaultLabel: 'Unit', defaultWidth: '10', defaultAlign: 'center' },
  { key: 'quantity', defaultLabel: 'Qty', defaultWidth: '12', defaultAlign: 'right' },
  { key: 'unitPrice', defaultLabel: 'Unit price', defaultWidth: '13', defaultAlign: 'right' },
  { key: 'amount', defaultLabel: 'Amount', defaultWidth: '13', defaultAlign: 'right' },
];

interface ColumnFormState {
  key: TableColumnKey;
  enabled: boolean;
  label: string;
  width: string;
  align: 'left' | 'center' | 'right';
}

interface TemplateFormState {
  name: string;
  marginPt: number;
  fontFamily: string;
  baseFontSize: number;
  titleFontSize: number;
  headingFontSize: number;
  textColor: string;
  mutedColor: string;
  tableHeaderBackground: string;
  borderColor: string;
  showCreationLocationDate: boolean;
  showSlogan: boolean;
  showEstimateNumberAndDate: boolean;
  showPageNumbers: boolean;
  showCompanyInfo: boolean;
  showTableBorders: boolean;
  columns: ColumnFormState[];
  totalLabel: string;
  totalCaption: string;
  signatureLabel: string;
}

function blankColumns(): ColumnFormState[] {
  return CANONICAL_COLUMNS.map((column) => ({
    key: column.key,
    enabled: true,
    label: column.defaultLabel,
    width: column.defaultWidth,
    align: column.defaultAlign,
  }));
}

function emptyFormState(): TemplateFormState {
  return {
    name: '',
    marginPt: defaultDocumentTemplate.page.marginPt,
    fontFamily: defaultDocumentTemplate.typography.fontFamily,
    baseFontSize: defaultDocumentTemplate.typography.baseFontSize,
    titleFontSize: defaultDocumentTemplate.typography.titleFontSize,
    headingFontSize: defaultDocumentTemplate.typography.headingFontSize,
    textColor: defaultDocumentTemplate.colors.text,
    mutedColor: defaultDocumentTemplate.colors.muted,
    tableHeaderBackground: defaultDocumentTemplate.colors.tableHeaderBackground,
    borderColor: defaultDocumentTemplate.colors.borderColor,
    showCreationLocationDate: defaultDocumentTemplate.cover.showCreationLocationDate,
    showSlogan: defaultDocumentTemplate.cover.showSlogan,
    showEstimateNumberAndDate: defaultDocumentTemplate.header.showEstimateNumberAndDate,
    showPageNumbers: defaultDocumentTemplate.footer.showPageNumbers,
    showCompanyInfo: defaultDocumentTemplate.footer.showCompanyInfo,
    showTableBorders: defaultDocumentTemplate.table.showBorders,
    columns: blankColumns(),
    totalLabel: defaultDocumentTemplate.finalPage.totalLabel,
    totalCaption: defaultDocumentTemplate.finalPage.totalCaption,
    signatureLabel: defaultDocumentTemplate.finalPage.signatureLabel,
  };
}

function templateToFormState(template: Template): TemplateFormState {
  const columns: ColumnFormState[] = CANONICAL_COLUMNS.map((canonical) => {
    const saved = template.table.columns.find((column) => column.key === canonical.key);
    return {
      key: canonical.key,
      enabled: Boolean(saved),
      label: saved?.label ?? canonical.defaultLabel,
      width: saved ? saved.width.replace('%', '') : canonical.defaultWidth,
      align: saved?.align ?? canonical.defaultAlign,
    };
  });

  return {
    name: template.name,
    marginPt: template.page.marginPt,
    fontFamily: template.typography.fontFamily,
    baseFontSize: template.typography.baseFontSize,
    titleFontSize: template.typography.titleFontSize,
    headingFontSize: template.typography.headingFontSize,
    textColor: template.colors.text,
    mutedColor: template.colors.muted,
    tableHeaderBackground: template.colors.tableHeaderBackground,
    borderColor: template.colors.borderColor,
    showCreationLocationDate: template.cover.showCreationLocationDate,
    showSlogan: template.cover.showSlogan,
    showEstimateNumberAndDate: template.header.showEstimateNumberAndDate,
    showPageNumbers: template.footer.showPageNumbers,
    showCompanyInfo: template.footer.showCompanyInfo,
    showTableBorders: template.table.showBorders,
    columns,
    totalLabel: template.finalPage.totalLabel,
    totalCaption: template.finalPage.totalCaption,
    signatureLabel: template.finalPage.signatureLabel,
  };
}

function formStateToTemplateData(form: TemplateFormState): Omit<Template, 'id' | 'isDefault'> {
  return {
    name: form.name.trim(),
    page: { size: 'A4', marginPt: form.marginPt },
    typography: {
      fontFamily: form.fontFamily,
      baseFontSize: form.baseFontSize,
      titleFontSize: form.titleFontSize,
      headingFontSize: form.headingFontSize,
    },
    colors: {
      text: form.textColor,
      muted: form.mutedColor,
      tableHeaderBackground: form.tableHeaderBackground,
      borderColor: form.borderColor,
    },
    cover: {
      showCreationLocationDate: form.showCreationLocationDate,
      showSlogan: form.showSlogan,
    },
    header: {
      showEstimateNumberAndDate: form.showEstimateNumberAndDate,
    },
    footer: {
      showPageNumbers: form.showPageNumbers,
      showCompanyInfo: form.showCompanyInfo,
    },
    table: {
      showBorders: form.showTableBorders,
      columns: form.columns
        .filter((column) => column.enabled)
        .map((column) => ({
          key: column.key,
          label: column.label,
          width: `${column.width}%`,
          align: column.align,
        })),
    },
    finalPage: {
      totalLabel: form.totalLabel,
      totalCaption: form.totalCaption,
      signatureLabel: form.signatureLabel,
    },
  };
}

const TemplatesPage: React.FC = () => {
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
      setError('Failed to load templates. Please try again.');
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

  const handleColumnToggle = (key: TableColumnKey) => {
    setFormData((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.key === key ? { ...column, enabled: !column.enabled } : column
      ),
    }));
  };

  const handleColumnFieldChange = (
    key: TableColumnKey,
    field: 'label' | 'width' | 'align',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.key === key ? { ...column, [field]: value } : column
      ),
    }));
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Template name is required.');
      return;
    }
    if (!formData.columns.some((column) => column.enabled)) {
      alert('At least one table column must be enabled.');
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
      console.error('Failed to save template:', err);
      alert(err instanceof Error ? err.message : 'Failed to save template.');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await templateService.setDefaultTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to set default template:', err);
      alert(err instanceof Error ? err.message : 'Failed to set default template.');
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      await templateService.duplicateTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to duplicate template:', err);
      alert(err instanceof Error ? err.message : 'Failed to duplicate template.');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await templateService.deleteTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete template.');
    }
  };

  return (
    <div className="templates-page">
      <h1>Templates</h1>
      <p className="templates-intro">
        Templates control how estimates are presented — page layout, typography, cover, header,
        footer, table columns and final-page wording. They never change estimate data.
      </p>

      <div className="templates-toolbar">
        <button onClick={handleCreateTemplate} className="add-button">
          New Template
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && <p>Loading templates...</p>}

      {!loading && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Default</th>
                <th>Columns</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="no-items">
                    No templates found.
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>{template.isDefault ? 'Default' : ''}</td>
                    <td>{template.table.columns.map((column) => column.label).join(', ')}</td>
                    <td>
                      <button onClick={() => handleEditTemplate(template)} className="actions-button">
                        Edit
                      </button>
                      {!template.isDefault && (
                        <button
                          onClick={() => handleSetDefault(template.id)}
                          className="actions-button"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicateTemplate(template.id)}
                        className="actions-button"
                      >
                        Duplicate
                      </button>
                      <button onClick={() => handleDeleteTemplate(template.id)} className="delete-button">
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
          <div className="modal-content template-modal-content">
            <h2>{editingId ? 'Edit Template' : 'New Template'}</h2>
            <form onSubmit={handleSaveTemplate} className="template-form">
              <fieldset>
                <legend>Name</legend>
                <div className="form-group">
                  <label>
                    Template name:
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Page layout</legend>
                <div className="form-group">
                  <label>
                    Margin (pt):
                    <input
                      type="number"
                      min="0"
                      value={formData.marginPt}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, marginPt: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Typography</legend>
                <div className="form-row">
                  <label>
                    Font family:
                    <select
                      value={formData.fontFamily}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fontFamily: e.target.value }))}
                    >
                      {FONT_FAMILIES.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Body size:
                    <input
                      type="number"
                      min="6"
                      value={formData.baseFontSize}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, baseFontSize: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </label>
                  <label>
                    Heading size:
                    <input
                      type="number"
                      min="6"
                      value={formData.headingFontSize}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, headingFontSize: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </label>
                  <label>
                    Title size:
                    <input
                      type="number"
                      min="6"
                      value={formData.titleFontSize}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, titleFontSize: parseFloat(e.target.value) || 0 }))
                      }
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Colors</legend>
                <div className="form-row">
                  <label>
                    Text:
                    <input
                      type="color"
                      value={formData.textColor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, textColor: e.target.value }))}
                    />
                  </label>
                  <label>
                    Muted text:
                    <input
                      type="color"
                      value={formData.mutedColor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, mutedColor: e.target.value }))}
                    />
                  </label>
                  <label>
                    Table header background:
                    <input
                      type="color"
                      value={formData.tableHeaderBackground}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, tableHeaderBackground: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Border color:
                    <input
                      type="color"
                      value={formData.borderColor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, borderColor: e.target.value }))}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Cover page</legend>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.showCreationLocationDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, showCreationLocationDate: e.target.checked }))
                    }
                  />
                  Show creation location/date
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.showSlogan}
                    onChange={(e) => setFormData((prev) => ({ ...prev, showSlogan: e.target.checked }))}
                  />
                  Show slogan
                </label>
              </fieldset>

              <fieldset>
                <legend>Header</legend>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.showEstimateNumberAndDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, showEstimateNumberAndDate: e.target.checked }))
                    }
                  />
                  Show estimate number and date
                </label>
              </fieldset>

              <fieldset>
                <legend>Footer</legend>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.showPageNumbers}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, showPageNumbers: e.target.checked }))
                    }
                  />
                  Show page numbers
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.showCompanyInfo}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, showCompanyInfo: e.target.checked }))
                    }
                  />
                  Show company info
                </label>
              </fieldset>

              <fieldset>
                <legend>Table columns</legend>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.showTableBorders}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, showTableBorders: e.target.checked }))
                    }
                  />
                  Show row borders
                </label>
                <table className="column-config-table">
                  <thead>
                    <tr>
                      <th>Show</th>
                      <th>Column</th>
                      <th>Label</th>
                      <th>Width (%)</th>
                      <th>Align</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.columns.map((column) => (
                      <tr key={column.key}>
                        <td>
                          <input
                            type="checkbox"
                            checked={column.enabled}
                            onChange={() => handleColumnToggle(column.key)}
                            aria-label={`Show ${column.key} column`}
                          />
                        </td>
                        <td>{column.key}</td>
                        <td>
                          <input
                            type="text"
                            value={column.label}
                            disabled={!column.enabled}
                            onChange={(e) => handleColumnFieldChange(column.key, 'label', e.target.value)}
                            aria-label={`${column.key} label`}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={column.width}
                            disabled={!column.enabled}
                            onChange={(e) => handleColumnFieldChange(column.key, 'width', e.target.value)}
                            aria-label={`${column.key} width`}
                          />
                        </td>
                        <td>
                          <select
                            value={column.align}
                            disabled={!column.enabled}
                            onChange={(e) => handleColumnFieldChange(column.key, 'align', e.target.value)}
                            aria-label={`${column.key} alignment`}
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </fieldset>

              <fieldset>
                <legend>Final page</legend>
                <div className="form-group">
                  <label>
                    Total label:
                    <input
                      type="text"
                      value={formData.totalLabel}
                      onChange={(e) => setFormData((prev) => ({ ...prev, totalLabel: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Total caption:
                    <input
                      type="text"
                      value={formData.totalCaption}
                      onChange={(e) => setFormData((prev) => ({ ...prev, totalCaption: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Signature label:
                    <input
                      type="text"
                      value={formData.signatureLabel}
                      onChange={(e) => setFormData((prev) => ({ ...prev, signatureLabel: e.target.value }))}
                    />
                  </label>
                </div>
              </fieldset>

              <div className="form-actions">
                <button type="button" onClick={() => setFormVisible(false)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {editingId ? 'Update' : 'Create'}
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
