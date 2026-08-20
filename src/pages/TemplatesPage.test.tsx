import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TemplatesPage from './TemplatesPage';
import { templateService } from '../services/templateService';
import { notify } from '../notifications';
import type { Template } from '../domain/models';
import '@testing-library/jest-dom';

vi.mock('../services/templateService');
vi.mock('../notifications');

const standardTemplate: Template = {
  id: 'template-1',
  name: 'Standard',
  isDefault: true,
  page: { size: 'A4', marginPt: 48 },
  typography: { fontFamily: 'Helvetica', baseFontSize: 9, titleFontSize: 22, headingFontSize: 12 },
  colors: { text: '#1a1a1a', muted: '#666666', tableHeaderBackground: '#eeeeee', borderColor: '#cccccc' },
  cover: { showCreationLocationDate: true, showSlogan: true },
  header: { showEstimateNumberAndDate: true },
  footer: { showPageNumbers: true, showCompanyInfo: true },
  table: {
    showBorders: true,
    showChapterSubtotal: true,
    columns: [
      { key: 'itemNumber', label: 'Item', width: '8%' },
      { key: 'description', label: 'Description', width: '92%' },
    ],
  },
  finalPage: {
    totalLabel: 'Total',
    totalCaption: 'IVA no incluido',
    signatureLabel: 'Conforme cliente',
    noteTitle: 'Condiciones',
    noteContent: '',
  },
};

const compactTemplate: Template = {
  ...standardTemplate,
  id: 'template-2',
  name: 'Compact',
  isDefault: false,
};

describe('TemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(templateService.getDefaultTemplate).mockResolvedValue(standardTemplate);
  });

  it('displays the template list after loading', async () => {
    vi.mocked(templateService.listTemplates).mockResolvedValue([standardTemplate, compactTemplate]);

    render(<TemplatesPage />);

    expect(await screen.findByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.queryByText(/loading templates/i)).not.toBeInTheDocument();
  });

  it('shows which template is the default', async () => {
    vi.mocked(templateService.listTemplates).mockResolvedValue([standardTemplate, compactTemplate]);

    render(<TemplatesPage />);
    await screen.findByText('Standard');

    const rows = screen.getAllByRole('row');
    const standardRow = rows.find((row) => row.textContent?.includes('Standard'));
    expect(standardRow?.textContent).toContain('Default');
  });

  it('creates a new template from the structured form', async () => {
    vi.mocked(templateService.listTemplates).mockResolvedValue([standardTemplate]);
    vi.mocked(templateService.createTemplate).mockResolvedValue(compactTemplate);

    const { container } = render(<TemplatesPage />);
    await waitFor(() => expect(screen.queryByText(/loading templates/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new template/i }));
    fireEvent.change(screen.getByLabelText(/template name:/i), { target: { value: 'Compact' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(templateService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Compact', isDefault: false })
      );
    });
  });

  it('rejects submission without a template name', async () => {
    vi.mocked(templateService.listTemplates).mockResolvedValue([standardTemplate]);

    const { container } = render(<TemplatesPage />);
    await waitFor(() => expect(screen.queryByText(/loading templates/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new template/i }));
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(templateService.createTemplate).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('edits an existing template, including toggling a table column off', async () => {
    vi.mocked(templateService.listTemplates).mockResolvedValue([standardTemplate]);
    vi.mocked(templateService.updateTemplate).mockResolvedValue(standardTemplate);

    const { container } = render(<TemplatesPage />);
    await screen.findByText('Standard');

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.click(screen.getByLabelText(/show itemnumber column/i));
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(templateService.updateTemplate).toHaveBeenCalledWith(
        standardTemplate.id,
        expect.objectContaining({
          table: expect.objectContaining({
            columns: [expect.objectContaining({ key: 'description' })],
          }),
        })
      );
    });
  });

  it('sets a template as default', async () => {
    vi.mocked(templateService.listTemplates).mockResolvedValue([standardTemplate, compactTemplate]);
    vi.mocked(templateService.setDefaultTemplate).mockResolvedValue({ ...compactTemplate, isDefault: true });

    render(<TemplatesPage />);
    await screen.findByText('Compact');

    fireEvent.click(screen.getByRole('button', { name: /set default/i }));

    await waitFor(() => {
      expect(templateService.setDefaultTemplate).toHaveBeenCalledWith(compactTemplate.id);
    });
  });

  it('duplicates a template', async () => {
    vi.mocked(templateService.listTemplates).mockResolvedValue([standardTemplate]);
    vi.mocked(templateService.duplicateTemplate).mockResolvedValue({
      ...standardTemplate,
      id: 'template-3',
      name: 'Standard (copy)',
      isDefault: false,
    });

    render(<TemplatesPage />);
    await screen.findByText('Standard');

    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));

    await waitFor(() => {
      expect(templateService.duplicateTemplate).toHaveBeenCalledWith(standardTemplate.id);
    });
  });

  it('deletes a template after confirmation and surfaces the guard error from the service', async () => {
    vi.mocked(templateService.listTemplates).mockResolvedValue([standardTemplate]);
    vi.mocked(templateService.deleteTemplate).mockRejectedValue(
      new Error('Cannot delete the only remaining template.')
    );
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<TemplatesPage />);
    await screen.findByText('Standard');

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(templateService.deleteTemplate).toHaveBeenCalledWith(standardTemplate.id);
      expect(notify).toHaveBeenCalledWith('Cannot delete the only remaining template.', 'error');
    });

    window.confirm = originalConfirm;
  });
});
