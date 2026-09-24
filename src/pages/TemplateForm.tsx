import React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultDocumentTemplate } from '../rendering/templateConfig';
import { resizeImageToA4 } from '../utils/imageResize';
import { resizePdfToA4 } from '../utils/pdfBackgroundResize';
import { notify } from '../notifications';
import { PdfViewerModal } from '../components/PdfViewerModal';
import type { Template, TemplateConfig, TableColumnKey, CoverPosition } from '../domain/models';

export const COVER_POSITIONS: CoverPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

// Structured, constrained template editor (SPECS.md §9), shared between the
// Templates page (editing a saved, reusable template) and the estimate
// editor's "Edit template" modal (editing a per-estimate override on top of
// whichever template is selected — see EstimateEditorPage). Users configure
// page layout, typography, colors, cover/header/footer toggles, which table
// columns appear (and their label/width/alignment) and final-page wording —
// not a free-form/WYSIWYG canvas.
//
// Note: the default column labels below (CANONICAL_COLUMNS) seed a
// template's *data* (the label printed on generated PDFs), not app UI
// chrome — they're deliberately not run through the i18n layer here.

export const FONT_FAMILIES = ['Helvetica', 'Times-Roman', 'Courier'];

export const CANONICAL_COLUMNS: Array<{
  key: TableColumnKey;
  defaultLabel: string;
  defaultWidth: string;
  defaultAlign: 'left' | 'center' | 'right';
}> = [
  { key: 'itemNumber', defaultLabel: 'Item', defaultWidth: '8', defaultAlign: 'left' },
  { key: 'description', defaultLabel: 'Description', defaultWidth: '44', defaultAlign: 'left' },
  { key: 'unit', defaultLabel: 'Unit', defaultWidth: '10', defaultAlign: 'center' },
  { key: 'quantity', defaultLabel: 'Qty', defaultWidth: '12', defaultAlign: 'right' },
  { key: 'unitPrice', defaultLabel: 'Unit price', defaultWidth: '13', defaultAlign: 'right' },
  { key: 'amount', defaultLabel: 'Amount', defaultWidth: '13', defaultAlign: 'right' },
];

export interface ColumnFormState {
  key: TableColumnKey;
  enabled: boolean;
  label: string;
  width: string;
  align: 'left' | 'center' | 'right';
}

export interface TemplateFormState {
  name: string;
  marginPt: number;
  /** Background image for the cover (first) page only — data URI, already resized to A4. */
  coverBackgroundImage?: string;
  /** Background image for every page except the cover — data URI, already resized to A4. */
  pageBackgroundImage?: string;
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
  /** Where the estimate number/date block sits on the cover page. */
  headerPosition: CoverPosition;
  /** Fine-tune offset (points) on top of headerPosition. */
  headerOffsetX: number;
  headerOffsetY: number;
  /** Where the subject/title text sits on the cover page. */
  subjectPosition: CoverPosition;
  /** Fine-tune offset (points) on top of subjectPosition. */
  subjectOffsetX: number;
  subjectOffsetY: number;
  showEstimateNumberAndDate: boolean;
  showPageNumbers: boolean;
  showCompanyInfo: boolean;
  showTableBorders: boolean;
  showChapterSubtotal: boolean;
  columns: ColumnFormState[];
  totalLabel: string;
  signatureLabel: string;
  noteTitle: string;
  noteContent: string;
}

export function blankColumns(): ColumnFormState[] {
  return CANONICAL_COLUMNS.map((column) => ({
    key: column.key,
    enabled: true,
    label: column.defaultLabel,
    width: column.defaultWidth,
    align: column.defaultAlign,
  }));
}

export function emptyFormState(): TemplateFormState {
  return {
    name: '',
    marginPt: defaultDocumentTemplate.page.marginPt,
    coverBackgroundImage: defaultDocumentTemplate.cover.backgroundImage,
    pageBackgroundImage: defaultDocumentTemplate.page.backgroundImage,
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
    headerPosition: defaultDocumentTemplate.cover.headerPosition ?? 'top-left',
    headerOffsetX: defaultDocumentTemplate.cover.headerOffsetX ?? 0,
    headerOffsetY: defaultDocumentTemplate.cover.headerOffsetY ?? 0,
    subjectPosition: defaultDocumentTemplate.cover.subjectPosition ?? 'middle-center',
    subjectOffsetX: defaultDocumentTemplate.cover.subjectOffsetX ?? 0,
    subjectOffsetY: defaultDocumentTemplate.cover.subjectOffsetY ?? 0,
    showEstimateNumberAndDate: defaultDocumentTemplate.header.showEstimateNumberAndDate,
    showPageNumbers: defaultDocumentTemplate.footer.showPageNumbers,
    showCompanyInfo: defaultDocumentTemplate.footer.showCompanyInfo,
    showTableBorders: defaultDocumentTemplate.table.showBorders,
    showChapterSubtotal: defaultDocumentTemplate.table.showChapterSubtotal,
    columns: blankColumns(),
    totalLabel: defaultDocumentTemplate.finalPage.totalLabel,
    signatureLabel: defaultDocumentTemplate.finalPage.signatureLabel,
    noteTitle: defaultDocumentTemplate.finalPage.noteTitle,
    noteContent: defaultDocumentTemplate.finalPage.noteContent,
  };
}

/** Accepts either a saved Template or a bare TemplateConfig (e.g. an
 * estimate's resolved, un-named presentation config) — the name field just
 * falls back to an empty string when there isn't one to show. */
export function templateToFormState(template: TemplateConfig & Partial<Pick<Template, 'name'>>): TemplateFormState {
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
    name: template.name ?? '',
    marginPt: template.page.marginPt,
    coverBackgroundImage: template.cover.backgroundImage,
    pageBackgroundImage: template.page.backgroundImage,
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
    headerPosition: template.cover.headerPosition ?? 'top-left',
    headerOffsetX: template.cover.headerOffsetX ?? 0,
    headerOffsetY: template.cover.headerOffsetY ?? 0,
    subjectPosition: template.cover.subjectPosition ?? 'middle-center',
    subjectOffsetX: template.cover.subjectOffsetX ?? 0,
    subjectOffsetY: template.cover.subjectOffsetY ?? 0,
    showEstimateNumberAndDate: template.header.showEstimateNumberAndDate,
    showPageNumbers: template.footer.showPageNumbers,
    showCompanyInfo: template.footer.showCompanyInfo,
    showTableBorders: template.table.showBorders,
    showChapterSubtotal: template.table.showChapterSubtotal,
    columns,
    totalLabel: template.finalPage.totalLabel,
    signatureLabel: template.finalPage.signatureLabel,
    noteTitle: template.finalPage.noteTitle,
    noteContent: template.finalPage.noteContent,
  };
}

export function formStateToTemplateConfig(form: TemplateFormState): TemplateConfig {
  return {
    page: { size: 'A4', marginPt: form.marginPt, backgroundImage: form.pageBackgroundImage },
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
      backgroundImage: form.coverBackgroundImage,
      headerPosition: form.headerPosition,
      headerOffsetX: form.headerOffsetX,
      headerOffsetY: form.headerOffsetY,
      subjectPosition: form.subjectPosition,
      subjectOffsetX: form.subjectOffsetX,
      subjectOffsetY: form.subjectOffsetY,
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
      showChapterSubtotal: form.showChapterSubtotal,
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
      signatureLabel: form.signatureLabel,
      noteTitle: form.noteTitle,
      noteContent: form.noteContent,
    },
  };
}

export function formStateToTemplateData(form: TemplateFormState): Omit<Template, 'id' | 'isDefault'> {
  return { name: form.name.trim(), ...formStateToTemplateConfig(form) };
}

export interface TemplatePreviewActionsProps {
  /** Whatever is currently in the form, including unsaved edits — the whole
   * point is checking a change before committing to it, not requiring a
   * save first. */
  formData: TemplateFormState;
}

/**
 * "Preview"/"Download preview" buttons for a template being edited, meant to
 * sit alongside the modal's own title rather than inside the scrollable
 * field list (TemplateFormFields) below it. Preview opens the generated PDF
 * directly in the in-app viewer (PdfViewerModal) without writing anything to
 * disk; "Download preview" keeps the previous save-to-disk behavior for
 * anyone who wants a copy.
 */
export const TemplatePreviewActions: React.FC<TemplatePreviewActionsProps> = ({ formData }) => {
  const { t } = useTranslation();
  const [previewing, setPreviewing] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [previewBlob, setPreviewBlob] = React.useState<Blob | null>(null);

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const { buildTemplatePreviewBlob } = await import('../services/templatePreviewService');
      const blob = await buildTemplatePreviewBlob(formStateToTemplateConfig(formData));
      setPreviewBlob(blob);
    } catch (err) {
      console.error('Failed to preview template:', { formData, error: err });
      notify(err instanceof Error ? err.message : t('templates.modal.sections.previewError'), 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { downloadTemplatePreview } = await import('../services/templatePreviewService');
      await downloadTemplatePreview(formStateToTemplateConfig(formData), formData.name);
    } catch (err) {
      console.error('Failed to download template preview:', { formData, error: err });
      notify(err instanceof Error ? err.message : t('templates.modal.sections.downloadPreviewError'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="template-preview-actions">
      <button type="button" className="add-button" onClick={handlePreview} disabled={previewing}>
        {previewing ? t('templates.modal.sections.previewing') : t('templates.modal.sections.preview')}
      </button>
      <button type="button" className="add-button" onClick={handleDownload} disabled={downloading}>
        {downloading
          ? t('templates.modal.sections.downloadingPreview')
          : t('templates.modal.sections.downloadPreview')}
      </button>
      {previewBlob && (
        <PdfViewerModal
          blob={previewBlob}
          title={formData.name.trim() || t('templates.modal.sections.preview')}
          onClose={() => setPreviewBlob(null)}
        />
      )}
    </div>
  );
};

interface TemplateFormFieldsProps {
  formData: TemplateFormState;
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  /** Hide the "Name" section — irrelevant when editing an unnamed per-estimate override. */
  showNameField?: boolean;
}

export const TemplateFormFields: React.FC<TemplateFormFieldsProps> = ({
  formData,
  setFormData,
  showNameField = true,
}) => {
  const { t } = useTranslation();

  const handleColumnToggle = (key: TableColumnKey) => {
    setFormData((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.key === key ? { ...column, enabled: !column.enabled } : column
      ),
    }));
  };

  const handleColumnFieldChange = (key: TableColumnKey, field: 'label' | 'width' | 'align', value: string) => {
    setFormData((prev) => ({
      ...prev,
      columns: prev.columns.map((column) => (column.key === key ? { ...column, [field]: value } : column)),
    }));
  };

  const handleBackgroundImageChange = async (
    field: 'coverBackgroundImage' | 'pageBackgroundImage',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file again later
    if (!file) return;
    try {
      // A PDF background (e.g. a vector letterhead exported from a design
      // tool) is rasterized to the same A4 raster format as an image
      // upload — the rendering pipeline only ever deals with images.
      const dataUri =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
          ? await resizePdfToA4(file)
          : await resizeImageToA4(file);
      setFormData((prev) => ({ ...prev, [field]: dataUri }));
    } catch (err) {
      console.error('Failed to process background image:', {
        field,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        error: err,
      });
      notify(t('templates.modal.sections.backgroundImageError'), 'error');
    }
  };

  const renderBackgroundImagePicker = (
    field: 'coverBackgroundImage' | 'pageBackgroundImage',
    label: string
  ) => (
    <div className="form-group background-image-picker">
      <label>
        {label}
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => handleBackgroundImageChange(field, e)}
        />
      </label>
      {formData[field] && (
        <div className="background-image-preview">
          <img src={formData[field]} alt="" />
          <button
            type="button"
            className="cancel-button"
            onClick={() => setFormData((prev) => ({ ...prev, [field]: undefined }))}
          >
            {t('templates.modal.sections.removeBackgroundImage')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {showNameField && (
        <fieldset>
          <legend>{t('templates.modal.sections.name')}</legend>
          <div className="form-group">
            <label>
              {t('templates.modal.sections.templateName')}
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>{t('templates.modal.sections.pageLayout')}</legend>
        <div className="form-group">
          <label>
            {t('templates.modal.sections.marginPt')}
            <input
              type="number"
              min="0"
              value={formData.marginPt}
              onChange={(e) => setFormData((prev) => ({ ...prev, marginPt: parseFloat(e.target.value) || 0 }))}
            />
          </label>
        </div>
        {renderBackgroundImagePicker('pageBackgroundImage', t('templates.modal.sections.pageBackgroundImage'))}
      </fieldset>

      <fieldset>
        <legend>{t('templates.modal.sections.typography')}</legend>
        <div className="form-row">
          <label>
            {t('templates.modal.sections.fontFamily')}
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
            {t('templates.modal.sections.bodySize')}
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
            {t('templates.modal.sections.headingSize')}
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
            {t('templates.modal.sections.titleSize')}
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
        <legend>{t('templates.modal.sections.colors')}</legend>
        <div className="form-row">
          <label>
            {t('templates.modal.sections.textColor')}
            <input
              type="color"
              value={formData.textColor}
              onChange={(e) => setFormData((prev) => ({ ...prev, textColor: e.target.value }))}
            />
          </label>
          <label>
            {t('templates.modal.sections.mutedColor')}
            <input
              type="color"
              value={formData.mutedColor}
              onChange={(e) => setFormData((prev) => ({ ...prev, mutedColor: e.target.value }))}
            />
          </label>
          <label>
            {t('templates.modal.sections.tableHeaderBackground')}
            <input
              type="color"
              value={formData.tableHeaderBackground}
              onChange={(e) => setFormData((prev) => ({ ...prev, tableHeaderBackground: e.target.value }))}
            />
          </label>
          <label>
            {t('templates.modal.sections.borderColor')}
            <input
              type="color"
              value={formData.borderColor}
              onChange={(e) => setFormData((prev) => ({ ...prev, borderColor: e.target.value }))}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('templates.modal.sections.coverPage')}</legend>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.showCreationLocationDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, showCreationLocationDate: e.target.checked }))}
          />
          {t('templates.modal.sections.showCreationLocationDate')}
        </label>
        <div className="form-group">
          <label>
            {t('templates.modal.sections.headerPosition')}
            <select
              value={formData.headerPosition}
              disabled={!formData.showCreationLocationDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, headerPosition: e.target.value as CoverPosition }))
              }
            >
              {COVER_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {t(`templates.modal.sections.coverPositions.${position}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            {t('templates.modal.sections.offsetX')}
            <input
              type="number"
              value={formData.headerOffsetX}
              disabled={!formData.showCreationLocationDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, headerOffsetX: parseFloat(e.target.value) || 0 }))
              }
            />
          </label>
          <label>
            {t('templates.modal.sections.offsetY')}
            <input
              type="number"
              value={formData.headerOffsetY}
              disabled={!formData.showCreationLocationDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, headerOffsetY: parseFloat(e.target.value) || 0 }))
              }
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.showSlogan}
            onChange={(e) => setFormData((prev) => ({ ...prev, showSlogan: e.target.checked }))}
          />
          {t('templates.modal.sections.showSlogan')}
        </label>
        <div className="form-group">
          <label>
            {t('templates.modal.sections.subjectPosition')}
            <select
              value={formData.subjectPosition}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subjectPosition: e.target.value as CoverPosition }))
              }
            >
              {COVER_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {t(`templates.modal.sections.coverPositions.${position}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            {t('templates.modal.sections.offsetX')}
            <input
              type="number"
              value={formData.subjectOffsetX}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subjectOffsetX: parseFloat(e.target.value) || 0 }))
              }
            />
          </label>
          <label>
            {t('templates.modal.sections.offsetY')}
            <input
              type="number"
              value={formData.subjectOffsetY}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subjectOffsetY: parseFloat(e.target.value) || 0 }))
              }
            />
          </label>
        </div>
        {renderBackgroundImagePicker('coverBackgroundImage', t('templates.modal.sections.coverBackgroundImage'))}
      </fieldset>

      <fieldset>
        <legend>{t('templates.modal.sections.header')}</legend>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.showEstimateNumberAndDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, showEstimateNumberAndDate: e.target.checked }))}
          />
          {t('templates.modal.sections.showEstimateNumberAndDate')}
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('templates.modal.sections.footer')}</legend>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.showPageNumbers}
            onChange={(e) => setFormData((prev) => ({ ...prev, showPageNumbers: e.target.checked }))}
          />
          {t('templates.modal.sections.showPageNumbers')}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.showCompanyInfo}
            onChange={(e) => setFormData((prev) => ({ ...prev, showCompanyInfo: e.target.checked }))}
          />
          {t('templates.modal.sections.showCompanyInfo')}
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('templates.modal.sections.tableColumns')}</legend>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.showTableBorders}
            onChange={(e) => setFormData((prev) => ({ ...prev, showTableBorders: e.target.checked }))}
          />
          {t('templates.modal.sections.showRowBorders')}
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.showChapterSubtotal}
            onChange={(e) => setFormData((prev) => ({ ...prev, showChapterSubtotal: e.target.checked }))}
          />
          {t('templates.modal.sections.showChapterSubtotal')}
        </label>
        <table className="column-config-table">
          <thead>
            <tr>
              <th>{t('templates.modal.sections.columnTable.show')}</th>
              <th>{t('templates.modal.sections.columnTable.column')}</th>
              <th>{t('templates.modal.sections.columnTable.label')}</th>
              <th>{t('templates.modal.sections.columnTable.width')}</th>
              <th>{t('templates.modal.sections.columnTable.align')}</th>
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
                    aria-label={t('templates.modal.sections.columnTable.showColumnAriaLabel', {
                      column: column.key,
                    })}
                  />
                </td>
                <td>{column.key}</td>
                <td>
                  <input
                    type="text"
                    value={column.label}
                    disabled={!column.enabled}
                    onChange={(e) => handleColumnFieldChange(column.key, 'label', e.target.value)}
                    aria-label={t('templates.modal.sections.columnTable.labelAriaLabel', {
                      column: column.key,
                    })}
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
                    aria-label={t('templates.modal.sections.columnTable.widthAriaLabel', {
                      column: column.key,
                    })}
                  />
                </td>
                <td>
                  <select
                    value={column.align}
                    disabled={!column.enabled}
                    onChange={(e) => handleColumnFieldChange(column.key, 'align', e.target.value)}
                    aria-label={t('templates.modal.sections.columnTable.alignAriaLabel', {
                      column: column.key,
                    })}
                  >
                    <option value="left">{t('templates.modal.sections.alignOptions.left')}</option>
                    <option value="center">{t('templates.modal.sections.alignOptions.center')}</option>
                    <option value="right">{t('templates.modal.sections.alignOptions.right')}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>

      <fieldset>
        <legend>{t('templates.modal.sections.finalPage')}</legend>
        <div className="form-group">
          <label>
            {t('templates.modal.sections.totalLabel')}
            <input
              type="text"
              value={formData.totalLabel}
              onChange={(e) => setFormData((prev) => ({ ...prev, totalLabel: e.target.value }))}
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            {t('templates.modal.sections.signatureLabel')}
            <input
              type="text"
              value={formData.signatureLabel}
              onChange={(e) => setFormData((prev) => ({ ...prev, signatureLabel: e.target.value }))}
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            {t('templates.modal.sections.noteTitle')}
            <input
              type="text"
              value={formData.noteTitle}
              onChange={(e) => setFormData((prev) => ({ ...prev, noteTitle: e.target.value }))}
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            {t('templates.modal.sections.noteContent')}
            <textarea
              rows={4}
              value={formData.noteContent}
              onChange={(e) => setFormData((prev) => ({ ...prev, noteContent: e.target.value }))}
            />
          </label>
        </div>
      </fieldset>
    </>
  );
};
