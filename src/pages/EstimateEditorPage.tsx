import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { estimateService } from '../services';
import {
  chapterRepositoryClient as chapterRepository,
  lineItemRepositoryClient as lineItemRepository,
} from '../db/estimateRepositoryClient';
import { customerRepositoryClient as customerRepository } from '../db/customerRepositoryClient';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { appSettingsRepositoryClient } from '../db/appSettingsRepositoryClient';
import { templateService } from '../services/templateService';
import { createLineItemFromItem, ensureItemExists, searchItems } from '../services/itemService';
import { Estimate, Chapter, Item, LineItem, Customer, Template } from '../domain/models';
import { notify } from '../notifications';
import './EstimatesPage.css';

const EstimateEditorPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string | undefined }>();
  const navigate = useNavigate();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [chapters, setChapters] = useState<Array<Chapter & { lineItems: LineItem[] }>>([]);
  const [customers, setCustomers] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Modal states
  const [chapterModalOpen, setChapterModalOpen] = useState<boolean>(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState<Partial<Chapter>>({ title: '', order: 0 });

  const [lineItemModalOpen, setLineItemModalOpen] = useState<boolean>(false);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);
  const [lineItemForm, setLineItemForm] = useState<Partial<LineItem>>({
    code: '',
    description: '',
    unit: '',
    quantity: 0,
    unitPrice: 0,
    amount: 0,
    order: 0,
  });

  // Item library (for "insert from library" into a line item)
  const [libraryItems, setLibraryItems] = useState<Item[]>([]);
  const [librarySearchTerm, setLibrarySearchTerm] = useState<string>('');

  // Templates (which one governs this estimate's export/presentation)
  const [templates, setTemplates] = useState<Template[]>([]);

  // Quick "add customer" modal, offered next to the customer field when
  // none is selected yet, so the user doesn't have to leave the estimate.
  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    name: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
    notes: '',
  });

  // Load customers for dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await customerRepository.findMany();
        setCustomers(data);
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    };
    loadCustomers();
  }, []);

  // Load item library for the "insert from library" picker
  useEffect(() => {
    const loadLibraryItems = async () => {
      try {
        const data = await itemRepositoryClient.findMany();
        setLibraryItems(data);
      } catch (err) {
        console.error('Failed to load item library:', err);
      }
    };
    loadLibraryItems();
  }, []);

  // Load templates for the "which template renders this estimate" picker
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        await templateService.getDefaultTemplate(); // ensures a built-in default exists
        const data = await templateService.listTemplates();
        setTemplates(data);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };
    loadTemplates();
  }, []);

  // Load estimate (if not new) and its chapters/line items
  useEffect(() => {
    const loadEstimate = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id || id === 'new') {
          // Initialize a blank estimate
          const now = new Date();
          const [{ defaultTaxRate }, defaultTemplate] = await Promise.all([
            appSettingsRepositoryClient.get(),
            templateService.getDefaultTemplate(),
          ]);
          const blankEstimate: Estimate = {
            id: '', // will be set after creation
            estimateNumber: '', // will be generated on save
            year: now.getFullYear(),
            customerId: '',
            subject: '',
            site: '',
            creationDate: now.toISOString(),
            status: 'draft',
            taxRate: defaultTaxRate,
            introduction: '',
            templateId: defaultTemplate.id,
            finalNoteTitle: defaultTemplate.finalPage.noteTitle,
            finalNoteContent: defaultTemplate.finalPage.noteContent,
          };
          setEstimate(blankEstimate);
          setChapters([]);
          setLoading(false);
        } else {
          const estimateWithDetails = await estimateService.getEstimateWithDetails(id);
          if (!estimateWithDetails) {
            setError(t('estimateEditor.notFound'));
            setLoading(false);
            return;
          }
          setEstimate(estimateWithDetails);
          // chapters already contain lineItems from getEstimateWithDetails
          setChapters(
            estimateWithDetails.chapters.map((chap) => ({
              ...chap,
              lineItems: [...chap.lineItems],
            }))
          );
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load estimate:', err);
        setError(t('estimateEditor.errors.loadFailed'));
        setLoading(false);
      }
    };
    loadEstimate();
  }, [id]);


  // Calculate chapter total
  const calculateChapterTotal = (chapter: Chapter & { lineItems: LineItem[] }): number => {
    return estimateService.calculateChapterTotal(chapter as any);
  };

  // Calculate estimate total
  const calculateEstimateTotal = (): number => {
    const estWithDetails: any = {
      ...estimate,
      chapters: chapters.map((chap) => ({
        ...chap,
        lineItems: chap.lineItems,
      })),
    };
    return estimateService.calculateEstimateTotal(estWithDetails);
  };

  // Header change handlers
  const handleEstimateChange = (field: keyof Estimate, value: any) => {
    setEstimate((prev) => {
      if (!prev) return null; // Return null if no previous state (shouldn't happen in practice)
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Switching the template updates which one renders this estimate. If the
  // final-page note hasn't been customized yet (still blank), it's
  // pre-filled from the newly selected template — matching how a brand new
  // estimate gets it — without ever overwriting text the user already
  // typed for this estimate.
  const handleTemplateChange = (templateId: string) => {
    const selected = templates.find((tpl) => tpl.id === templateId);
    setEstimate((prev) => {
      if (!prev) return null;
      const shouldPrefillNote = !prev.finalNoteTitle && !prev.finalNoteContent;
      return {
        ...prev,
        templateId,
        finalNoteTitle: shouldPrefillNote && selected ? selected.finalPage.noteTitle : prev.finalNoteTitle,
        finalNoteContent: shouldPrefillNote && selected ? selected.finalPage.noteContent : prev.finalNoteContent,
      };
    });
  };

  // Quick "add customer" modal handlers
  const openCustomerModal = () => {
    setCustomerForm({ name: '', address: '', phone: '', email: '', taxId: '', notes: '' });
    setCustomerModalOpen(true);
  };

  const closeCustomerModal = () => {
    setCustomerModalOpen(false);
  };

  const handleCustomerFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.address || !customerForm.email) {
      notify(t('customers.errors.requiredFields'), 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerForm.email)) {
      notify(t('customers.errors.invalidEmail'), 'error');
      return;
    }

    try {
      const created = await customerRepository.create(customerForm as Omit<Customer, 'id'>);
      setCustomers((prev) => [...prev, created]);
      handleEstimateChange('customerId', created.id);
      setCustomerModalOpen(false);
      notify(t('estimateEditor.customerCreated'), 'success');
    } catch (err) {
      console.error('Failed to create customer:', err);
      notify(t('customers.errors.saveFailed'), 'error');
    }
  };

  // Save estimate header. `showNotification` is false when called from
  // handleSaveEstimate, which shows its own single "Estimate saved" toast
  // instead — otherwise clicking "Save Estimate" would show two toasts.
  const handleSaveHeader = async (showNotification: boolean = true): Promise<boolean> => {
    if (!estimate) return false;
    // Validate required fields
    if (!estimate.customerId || !estimate.subject) {
      notify(t('estimateEditor.errors.customerSubjectRequired'), 'error');
      return false;
    }
    try {
      // If estimate.id is empty, we are creating a new estimate
      if (!estimate.id) {
        // Generate estimate number
        const estimateNumber = await estimateService.generateEstimateNumber(estimate.year);
        const estimateToCreate = {
          ...estimate,
          estimateNumber,
        } as Omit<Estimate, 'id' | 'estimateNumber'>;
        const created = await estimateService.createEstimate(estimateToCreate);
        setEstimate((prev) => {
          if (!prev) return estimate; // This shouldn't happen due to the check above, but for type safety
          return {
            ...prev,
            id: created.id,
            estimateNumber: created.estimateNumber,
          };
        });
        // After creating header, we need to create chapters and line items
        // But we will handle that separately when user adds them.
        if (showNotification) {
          notify(t('estimateEditor.successCreated'), 'success');
        }
      } else {
        // Update existing header
        await estimateService.updateEstimateHeader(estimate.id, estimate);
        if (showNotification) {
          notify(t('estimateEditor.successHeaderUpdated'), 'success');
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to save estimate header:', err);
      notify(t('estimateEditor.errors.saveHeaderFailed'), 'error');
      return false;
    }
  };

  const handleExportPdf = async () => {
    if (!estimate?.id) return;
    setExportingPdf(true);
    try {
      // Dynamically imported so the PDF rendering engine (react-pdf) is only
      // ever downloaded when the user actually exports, keeping it out of
      // this page's (eagerly-loaded) main bundle.
      const { exportEstimatePdf } = await import('../services/pdfExportService');
      await exportEstimatePdf(estimate.id, { estimateNumber: estimate.estimateNumber });
    } catch (err) {
      console.error('Failed to export PDF:', err);
      notify(err instanceof Error ? err.message : t('estimateEditor.errors.exportFailed'), 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  // Chapter modal handlers
  const openChapterModal = (chapter: Chapter | null = null) => {
    setEditingChapterId(null);
    if (chapter) {
      setEditingChapterId(chapter.id);
      setChapterForm({ title: chapter.title, order: chapter.order });
    } else {
      setEditingChapterId(null);
      setChapterForm({ title: '', order: chapters.length + 1 });
    }
    setChapterModalOpen(true);
  };

  const closeChapterModal = () => {
    setChapterModalOpen(false);
    setEditingChapterId(null);
    setChapterForm({ title: '', order: 0 });
  };

  const handleChapterChange = (field: keyof Chapter, value: any) => {
    setChapterForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveChapter = async () => {
    if (!estimate) return;
    if (!estimate.id) {
      notify(t('estimateEditor.errors.saveEstimateBeforeChapters'), 'error');
      return;
    }
    if (!chapterForm.title?.trim()) {
      notify(t('estimateEditor.errors.chapterTitleRequired'), 'error');
      return;
    }
    try {
      if (editingChapterId) {
        // Update existing chapter
        const updated = await chapterRepository.update(editingChapterId, {
          ...chapterForm,
          estimateId: estimate.id,
        } as Chapter);
        // Reflect the change in local state — the repository update alone
        // doesn't touch the chapters already held in state, so without this
        // the UI kept showing the old title until the page was reloaded.
        setChapters((prev) =>
          prev.map((chap) => (chap.id === editingChapterId ? { ...chap, ...updated } : chap))
        );
      } else {
        // Create new chapter
        const newChapter = await chapterRepository.create({
          ...chapterForm,
          estimateId: estimate.id,
        } as Omit<Chapter, 'id'>);
        // Add to chapters list with empty lineItems
        setChapters((prev) => [
          ...prev,
          { ...newChapter, lineItems: [] },
        ]);
      }
      // Re-sort chapters by order
      setChapters((prev) => [...prev].sort((a, b) => a.order - b.order));
      closeChapterModal();
    } catch (err) {
      console.error('Failed to save chapter:', err);
      notify(t('estimateEditor.errors.saveChapterFailed'), 'error');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm(t('estimateEditor.confirmDeleteChapter'))) return;
    try {
      // Delete line items first
      const lineItems = await lineItemRepository.findByChapterId(chapterId);
      for (const li of lineItems) {
        await lineItemRepository.delete(li.id);
      }
      // Delete chapter
      await chapterRepository.delete(chapterId);
      // Remove from state
      setChapters((prev) => prev.filter((chap) => chap.id !== chapterId));
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      notify(t('estimateEditor.errors.deleteChapterFailed'), 'error');
    }
  };

  const handleMoveChapterUp = async (chapter: Chapter & { lineItems: LineItem[] }) => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((c) => c.id === chapter.id);
    if (index <= 0) return; // already first
    const prevChapter = sorted[index - 1];
    // Swap order numbers
    await chapterRepository.update(chapter.id, { order: prevChapter.order });
    await chapterRepository.update(prevChapter.id, { order: chapter.order });
    // Update local state
    setChapters((chaptersState) => {
      const mapped = chaptersState.map((chap) => {
        if (chap.id === chapter.id) return { ...chap, order: prevChapter.order };
        if (chap.id === prevChapter.id) return { ...chap, order: chapter.order };
        return chap;
      });
      return [...mapped].sort((a, b) => a.order - b.order);
    });
  };

  const handleMoveChapterDown = async (chapter: Chapter & { lineItems: LineItem[] }) => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((c) => c.id === chapter.id);
    if (index === sorted.length - 1) return; // already last
    const nextChapter = sorted[index + 1];
    // Swap order numbers
    await chapterRepository.update(chapter.id, { order: nextChapter.order });
    await chapterRepository.update(nextChapter.id, { order: chapter.order });
    // Update local state
    setChapters((chaptersState) => {
      const mapped = chaptersState.map((chap) => {
        if (chap.id === chapter.id) return { ...chap, order: nextChapter.order };
        if (chap.id === nextChapter.id) return { ...chap, order: chapter.order };
        return chap;
      });
      return [...mapped].sort((a, b) => a.order - b.order);
    });
  };

  // Line item modal handlers
  const openLineItemModal = (lineItem: LineItem | null = null, chapterId: string) => {
    setEditingLineItemId(null);
    if (lineItem) {
      setEditingLineItemId(lineItem.id);
      setLineItemForm({
        code: lineItem.code,
        description: lineItem.description,
        unit: lineItem.unit,
        quantity: lineItem.quantity,
        unitPrice: lineItem.unitPrice,
        amount: lineItem.amount,
        order: lineItem.order,
      });
    } else {
      setEditingLineItemId(null);
      // Determine next order for this chapter
      const chap = chapters.find((c) => c.id === chapterId);
      const nextOrder = chap ? chap.lineItems.length + 1 : 1;
      setLineItemForm({
        code: '',
        description: '',
        unit: '',
        quantity: 0,
        unitPrice: 0,
        amount: 0,
        order: nextOrder,
      });
    }
    // We need to know which chapter this line item belongs to; we'll store in a temporary state
    // For simplicity, we'll pass chapterId via a closure or use a separate state.
    // We'll create a state variable for active chapterId for line item modal.
    setActiveChapterIdForLineItem(chapterId);
    setLibrarySearchTerm('');
    setLineItemModalOpen(true);
  };

  // We need a state to track which chapter we are adding/editing line items for
  const [activeChapterIdForLineItem, setActiveChapterIdForLineItem] = useState<string | ''>('');

  // Insert from library: copy the item's current values into the line item
  // form. This is a one-time copy — the created line item stores no
  // reference back to the library item, so later edits to the library
  // entry never change line items that already used it.
  const handleInsertFromLibrary = (item: Item) => {
    const draft = createLineItemFromItem(item, {
      quantity: lineItemForm.quantity || 1,
      order: lineItemForm.order,
    });
    setLineItemForm((prev) => ({ ...prev, ...draft }));
  };

  const filteredLibraryItems = searchItems(libraryItems, librarySearchTerm);

  const closeLineItemModal = () => {
    setLineItemModalOpen(false);
    setEditingLineItemId(null);
    setLibrarySearchTerm('');
    setLineItemForm({
      code: '',
      description: '',
      unit: '',
      quantity: 0,
      unitPrice: 0,
      amount: 0,
      order: 0,
    });
    setActiveChapterIdForLineItem('');
  };

  const handleLineItemChange = (field: keyof LineItem, value: any) => {
    setLineItemForm((prev) => {
      const updated = { ...prev, [field]: value };
      // If quantity or unitPrice changes, recalculate amount
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? value : prev.quantity;
        const unitPrice = field === 'unitPrice' ? value : prev.unitPrice;
        const amount = Number(quantity) * Number(unitPrice);
        return { ...updated, amount };
      }
      return updated;
    });
  };

  const handleSaveLineItem = async () => {
    if (!activeChapterIdForLineItem) return;
    if (!lineItemForm.description?.trim() || !lineItemForm.unit?.trim()) {
      notify(t('estimateEditor.errors.descriptionUnitRequired'), 'error');
      return;
    }
    try {
      const data = {
        ...lineItemForm,
        chapterId: activeChapterIdForLineItem,
      } as LineItem;
      if (editingLineItemId) {
        await lineItemRepository.update(editingLineItemId, data);
      } else {
        const newLineItem = await lineItemRepository.create(
          data as Omit<LineItem, 'id'>
        );
        // Add to the chapter's lineItems array
        setChapters((prev) =>
          prev.map((chap) => {
            if (chap.id === activeChapterIdForLineItem) {
              return {
                ...chap,
                lineItems: [...chap.lineItems, { ...newLineItem, id: newLineItem.id }],
              };
            }
            return chap;
          })
        );
      }
      // Re-sort line items by order within the chapter
      setChapters((prev) =>
        prev.map((chap) => {
          if (chap.id === activeChapterIdForLineItem) {
            return {
              ...chap,
              lineItems: [...chap.lineItems].sort((a, b) => a.order - b.order),
            };
          }
          return chap;
        })
      );

      // Auto-add unrecognized items to the item library so they're
      // available for reuse next time.
      const newLibraryItem = await ensureItemExists(libraryItems, data);
      if (newLibraryItem && !libraryItems.some((item) => item.id === newLibraryItem.id)) {
        setLibraryItems((prev) => [...prev, newLibraryItem]);
      }

      closeLineItemModal();
    } catch (err) {
      console.error('Failed to save line item:', err);
      notify(t('estimateEditor.errors.saveLineItemFailed'), 'error');
    }
  };

  const handleDeleteLineItem = async (lineItemId: string) => {
    if (!window.confirm(t('estimateEditor.confirmDeleteLineItem'))) return;
    try {
      await lineItemRepository.delete(lineItemId);
      // Remove from state
      setChapters((prev) =>
        prev.map((chap) => {
          if (chap.lineItems.some((li) => li.id === lineItemId)) {
            return {
              ...chap,
              lineItems: chap.lineItems.filter((li) => li.id !== lineItemId),
            };
          }
          return chap;
        })
      );
    } catch (err) {
      console.error('Failed to delete line item:', err);
      notify(t('estimateEditor.errors.deleteLineItemFailed'), 'error');
    }
  };

  const handleMoveLineItemUp = async (
    lineItem: LineItem,
    chapterId: string
  ) => {
    // Find the chapter
    const chap = chapters.find((c) => c.id === chapterId);
    if (!chap) return;
    const sorted = [...chap.lineItems].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((li) => li.id === lineItem.id);
    if (index <= 0) return;
    const prevLineItem = sorted[index - 1];
    // Swap order numbers
    await lineItemRepository.update(lineItem.id, { order: prevLineItem.order });
    await lineItemRepository.update(prevLineItem.id, { order: lineItem.order });
    // Update state
    setChapters((chaptersState) =>
      chaptersState.map((chap) => {
        if (chap.id === chapterId) {
          return {
            ...chap,
            lineItems: [...chap.lineItems]
              .map((li) => {
                if (li.id === lineItem.id) return { ...li, order: prevLineItem.order };
                if (li.id === prevLineItem.id) return { ...li, order: lineItem.order };
                return li;
              })
              .sort((a, b) => a.order - b.order),
          };
        }
        return chap;
      })
    );
  };

  const handleMoveLineItemDown = async (
    lineItem: LineItem,
    chapterId: string
  ) => {
    const chap = chapters.find((c) => c.id === chapterId);
    if (!chap) return;
    const sorted = [...chap.lineItems].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((li) => li.id === lineItem.id);
    if (index === sorted.length - 1) return;
    const nextLineItem = sorted[index + 1];
    // Swap order numbers
    await lineItemRepository.update(lineItem.id, { order: nextLineItem.order });
    await lineItemRepository.update(nextLineItem.id, { order: lineItem.order });
    // Update state
    setChapters((chaptersState) =>
      chaptersState.map((chap) => {
        if (chap.id === chapterId) {
          return {
            ...chap,
            lineItems: [...chap.lineItems]
              .map((li) => {
                if (li.id === lineItem.id) return { ...li, order: nextLineItem.order };
                if (li.id === nextLineItem.id) return { ...li, order: lineItem.order };
                return li;
              })
              .sort((a, b) => a.order - b.order),
          };
        }
        return chap;
      })
    );
  };

  // Handle saving entire estimate (header + chapters + line items) maybe not needed as we save individually.
  const handleSaveEstimate = async () => {
    // Save header first, without its own notification — show a single
    // "Estimate saved" toast instead, and only if the save succeeded.
    const success = await handleSaveHeader(false);
    // Chapters and line items are saved individually on their own actions.
    if (success) {
      notify(t('estimateEditor.successSaved'), 'success');
    }
  };

  // Handle delete estimate
  const handleDeleteEstimate = async () => {
    if (!estimate) return;
    if (!window.confirm(t('estimateEditor.confirmDeleteEstimate'))) return;
    try {
      await estimateService.deleteEstimate(estimate.id);
      navigate('/estimates');
    } catch (err) {
      console.error('Failed to delete estimate:', err);
      notify(t('estimateEditor.errors.deleteEstimateFailed'), 'error');
    }
  };

  if (loading) return <div>{t('estimateEditor.loading')}</div>;
  if (error) return <div>{t('estimateEditor.errorPrefix', { message: error })}</div>;
  if (!estimate) return <div>{t('estimateEditor.unexpectedState')}</div>;

  return (
    <div className="estimates-page">
      <h1>
        {estimate.id
          ? t('estimateEditor.titleEdit', { number: estimate.estimateNumber })
          : t('estimateEditor.titleNew')}
      </h1>
      <div className="search-bar">
        <button onClick={() => navigate('/estimates')} className="add-button">
          {t('estimateEditor.backToList')}
        </button>
        <button onClick={handleSaveEstimate} className="add-button">
          {t('estimateEditor.saveEstimate')}
        </button>
        {estimate.id && (
          <button onClick={handleExportPdf} className="add-button" disabled={exportingPdf}>
            {exportingPdf ? t('estimateEditor.exporting') : t('estimateEditor.exportPdf')}
          </button>
        )}
        <button
          onClick={handleDeleteEstimate}
          className="delete-button"
          style={{ marginLeft: '0.5rem' }}
        >
          {t('estimateEditor.deleteEstimate')}
        </button>
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Estimate Header Form */}
      <div className="estimate-header-panel">
        <div className="estimate-header-panel-content">
          <form className="customer-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.year')}
                <input
                  type="number"
                  value={estimate.year || ''}
                  onChange={(e) =>
                    handleEstimateChange('year', parseInt(e.target.value) || 0)
                  }
                  min="1000"
                  max="9999"
                  required
                />
              </label>
            </div>
            <div className="form-group">
              <div className="customer-select-row">
                <label>
                  {t('estimateEditor.fields.customer')}
                  <select
                    value={estimate.customerId || ''}
                    onChange={(e) =>
                      handleEstimateChange('customerId', e.target.value)
                    }
                    required
                  >
                    <option value="">{t('estimateEditor.fields.selectCustomer')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {/* Deliberately a sibling of the label, not nested inside
                    it — a <label> implicitly labels every form control it
                    wraps, so putting this button inside the same label as
                    the select would give both the select and the button
                    the label's text as their accessible name. */}
                {!estimate.customerId && (
                  <button type="button" onClick={openCustomerModal} className="add-button">
                    {t('estimateEditor.addCustomerButton')}
                  </button>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.subject')}
                <input
                  type="text"
                  value={estimate.subject || ''}
                  onChange={(e) => handleEstimateChange('subject', e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.site')}
                <input
                  type="text"
                  value={estimate.site || ''}
                  onChange={(e) => handleEstimateChange('site', e.target.value)}
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.creationDate')}
                <input
                  type="date"
                  value={estimate.creationDate.split('T')[0] || ''}
                  onChange={(e) =>
                    handleEstimateChange(
                      'creationDate',
                      e.target.value ? new Date(e.target.value).toISOString() : ''
                    )
                  }
                  required
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.status')}
                <select
                  value={estimate.status || ''}
                  onChange={(e) => handleEstimateChange('status', e.target.value)}
                  required
                >
                  <option value="draft">{t('estimateEditor.fields.statusOptions.draft')}</option>
                  <option value="issued">{t('estimateEditor.fields.statusOptions.issued')}</option>
                  <option value="accepted">{t('estimateEditor.fields.statusOptions.accepted')}</option>
                </select>
              </label>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.taxRate')}
                <input
                  type="number"
                  value={estimate.taxRate || ''}
                  onChange={(e) =>
                    handleEstimateChange('taxRate', parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="0.01"
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.template')}
                <select
                  value={estimate.templateId || ''}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  {templates.length === 0 && <option value="">{estimate.templateId}</option>}
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                      {tpl.isDefault ? ` ${t('estimateEditor.fields.templateDefaultSuffix')}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.introduction')}
                <textarea
                  value={estimate.introduction || ''}
                  onChange={(e) => handleEstimateChange('introduction', e.target.value)}
                  rows={4}
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.finalNoteTitle')}
                <input
                  type="text"
                  value={estimate.finalNoteTitle || ''}
                  onChange={(e) => handleEstimateChange('finalNoteTitle', e.target.value)}
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                {t('estimateEditor.fields.finalNoteContent')}
                <textarea
                  value={estimate.finalNoteContent || ''}
                  onChange={(e) => handleEstimateChange('finalNoteContent', e.target.value)}
                  rows={6}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => handleSaveHeader()} className="submit-button">
                {t('estimateEditor.saveHeader')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Chapters List */}
      <h2>{t('estimateEditor.chaptersHeading')}</h2>
      <button
        onClick={() => openChapterModal(null)}
        className="add-button"
        disabled={!estimate.id}
        title={!estimate.id ? t('estimateEditor.saveBeforeChaptersHint') : undefined}
      >
        {t('estimateEditor.addChapter')}
      </button>
      {!estimate.id && <p>{t('estimateEditor.errors.saveEstimateBeforeChapters')}</p>}
      {chapters.length === 0 ? (
        <p>{t('estimateEditor.noChapters')}</p>
      ) : (
        chapters.map((chapter, chapterIndex) => (
          <div key={chapter.id} style={{ border: '1px solid #ccc', margin: '1rem 0', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{chapterIndex + 1}. {chapter.title}</h3>
              <div>
                <button
                  onClick={() => openChapterModal(chapter)}
                  className="actions-button"
                  style={{ marginRight: '0.25rem' }}
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDeleteChapter(chapter.id)}
                  className="delete-button"
                  style={{ marginRight: '0.25rem' }}
                >
                  {t('common.delete')}
                </button>
                <button
                  onClick={() => handleMoveChapterUp(chapter)}
                  className="actions-button"
                  disabled={chapters[0]?.id === chapter.id}
                  style={{ marginRight: '0.25rem' }}
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveChapterDown(chapter)}
                  className="actions-button"
                  disabled={chapters[chapters.length - 1]?.id === chapter.id}
                >
                  ↓
                </button>
              </div>
            </div>

            {/* Line Items for this chapter */}
            <h4>{t('estimateEditor.lineItemsHeading')}</h4>
            <button
              onClick={() => {
                openLineItemModal(null, chapter.id);
              }}
              className="add-button"
              style={{ marginBottom: '0.5rem' }}
            >
              {t('estimateEditor.addLineItem')}
            </button>
            {chapter.lineItems.length === 0 ? (
              <p>{t('estimateEditor.noLineItems')}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>{t('estimateEditor.lineItemFields.number')}</th>
                    <th>{t('estimateEditor.lineItemFields.code')}</th>
                    <th>{t('estimateEditor.lineItemFields.description')}</th>
                    <th>{t('estimateEditor.lineItemFields.unit')}</th>
                    <th>{t('estimateEditor.lineItemFields.quantity')}</th>
                    <th>{t('estimateEditor.lineItemFields.unitPrice')}</th>
                    <th>{t('estimateEditor.lineItemFields.amount')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chapter.lineItems.map((item, itemIndex) => (
                    <tr key={item.id}>
                      <td>{chapterIndex + 1}.{itemIndex + 1}</td>
                      <td>{item.code}</td>
                      <td>{item.description}</td>
                      <td>{item.unit}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unitPrice}</td>
                      <td>{item.amount}</td>
                      <td>
                        <button
                          onClick={() => openLineItemModal(item, chapter.id)}
                          className="actions-button"
                          style={{ marginRight: '0.25rem' }}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteLineItem(item.id)}
                          className="delete-button"
                          style={{ marginRight: '0.25rem' }}
                        >
                          {t('common.delete')}
                        </button>
                        <button
                          onClick={() => handleMoveLineItemUp(item, chapter.id)}
                          className="actions-button"
                          style={{ marginRight: '0.25rem' }}
                          disabled={chapter.lineItems[0]?.id === item.id}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveLineItemDown(item, chapter.id)}
                          className="actions-button"
                          disabled={chapter.lineItems[chapter.lineItems.length - 1]?.id === item.id}
                        >
                          ↓
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p>
              {t('estimateEditor.chapterTotal')} <strong>{calculateChapterTotal(chapter).toFixed(2)}</strong>
            </p>
          </div>
        ))
      )}

      <div style={{ marginTop: '2rem', fontWeight: 'bold', fontSize: '1.2em' }}>
        {t('estimateEditor.estimateTotal')} <strong>{calculateEstimateTotal().toFixed(2)}</strong>
      </div>

      {/* Chapter Modal */}
      {chapterModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingChapterId ? t('estimateEditor.chapterModal.editTitle') : t('estimateEditor.chapterModal.addTitle')}</h2>
            <form className="customer-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label>
                  {t('estimateEditor.chapterModal.titleLabel')}
                  <input
                    type="text"
                    value={chapterForm.title || ''}
                    onChange={(e) => handleChapterChange('title', e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('estimateEditor.chapterModal.orderLabel')}
                  <input
                    type="number"
                    value={chapterForm.order || ''}
                    onChange={(e) => handleChapterChange('order', parseInt(e.target.value) || 0)}
                    min="1"
                    required
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={closeChapterModal} className="cancel-button">
                  {t('common.cancel')}
                </button>
                <button type="button" onClick={handleSaveChapter} className="submit-button">
                  {editingChapterId ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Line Item Modal */}
      {lineItemModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingLineItemId ? t('estimateEditor.lineItemModal.editTitle') : t('estimateEditor.lineItemModal.addTitle')}</h2>
            <div className="form-group">
              <label>
                {t('estimateEditor.lineItemModal.insertFromLibrary')}
                <input
                  type="text"
                  placeholder={t('estimateEditor.lineItemModal.searchPlaceholder')}
                  value={librarySearchTerm}
                  onChange={(e) => setLibrarySearchTerm(e.target.value)}
                />
              </label>
              {librarySearchTerm && (
                <ul className="library-suggestions">
                  {filteredLibraryItems.length === 0 ? (
                    <li className="no-results">{t('estimateEditor.lineItemModal.noMatches')}</li>
                  ) : (
                    filteredLibraryItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleInsertFromLibrary(item)}
                          className="library-suggestion-button"
                        >
                          {item.code ? `${item.code} — ` : ''}
                          {item.description} ({item.unit}, {item.defaultPrice.toFixed(2)})
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            <form className="customer-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label>
                  {t('estimateEditor.lineItemModal.codeLabel')}
                  <input
                    type="text"
                    value={lineItemForm.code || ''}
                    onChange={(e) => handleLineItemChange('code', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('estimateEditor.lineItemModal.descriptionLabel')}
                  <input
                    type="text"
                    value={lineItemForm.description || ''}
                    onChange={(e) => handleLineItemChange('description', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('estimateEditor.lineItemModal.unitLabel')}
                  <input
                    type="text"
                    value={lineItemForm.unit || ''}
                    onChange={(e) => handleLineItemChange('unit', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('estimateEditor.lineItemModal.quantityLabel')}
                  <input
                    type="number"
                    value={lineItemForm.quantity || ''}
                    onChange={(e) => handleLineItemChange('quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('estimateEditor.lineItemModal.unitPriceLabel')}
                  <input
                    type="number"
                    value={lineItemForm.unitPrice || ''}
                    onChange={(e) => handleLineItemChange('unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('estimateEditor.lineItemModal.amountLabel')}
                  <input
                    type="number"
                    value={lineItemForm.amount || ''}
                    readOnly
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  {t('estimateEditor.lineItemModal.orderLabel')}
                  <input
                    type="number"
                    value={lineItemForm.order || ''}
                    onChange={(e) => handleLineItemChange('order', parseInt(e.target.value) || 0)}
                    min="1"
                    required
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={closeLineItemModal} className="cancel-button">
                  {t('common.cancel')}
                </button>
                <button type="button" onClick={handleSaveLineItem} className="submit-button">
                  {editingLineItemId ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick "add customer" modal */}
      {customerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{t('customers.addCustomer')}</h2>
            <form onSubmit={handleSaveNewCustomer} className="customer-form">
              <div className="form-group">
                <label>
                  {t('customers.fields.name')}:
                  <input
                    type="text"
                    name="name"
                    value={customerForm.name || ''}
                    onChange={handleCustomerFormChange}
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
                    value={customerForm.address || ''}
                    onChange={handleCustomerFormChange}
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
                    value={customerForm.email || ''}
                    onChange={handleCustomerFormChange}
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
                    value={customerForm.phone || ''}
                    onChange={handleCustomerFormChange}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={closeCustomerModal} className="cancel-button">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="submit-button">
                  {t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstimateEditorPage;
