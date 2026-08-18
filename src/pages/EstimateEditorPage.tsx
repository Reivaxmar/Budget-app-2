import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { estimateService } from '../services';
import {
  chapterRepositoryClient as chapterRepository,
  lineItemRepositoryClient as lineItemRepository,
} from '../db/estimateRepositoryClient';
import { customerRepositoryClient as customerRepository } from '../db/customerRepositoryClient';
import { itemRepositoryClient } from '../db/itemRepositoryClient';
import { createLineItemFromItem, ensureItemExists, searchItems } from '../services/itemService';
import { Estimate, Chapter, Item, LineItem } from '../domain/models';
import './EstimatesPage.css';

const EstimateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string | undefined }>();
  const navigate = useNavigate();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [chapters, setChapters] = useState<Array<Chapter & { lineItems: LineItem[] }>>([]);
  const [customers, setCustomers] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{id: string; message: string; type: 'success' | 'error' | 'info'}>>([]);

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

  // Load estimate (if not new) and its chapters/line items
  useEffect(() => {
    const loadEstimate = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id || id === 'new') {
          // Initialize a blank estimate
          const now = new Date();
          const blankEstimate: Estimate = {
            id: '', // will be set after creation
            estimateNumber: '', // will be generated on save
            year: now.getFullYear(),
            customerId: '',
            subject: '',
            site: '',
            creationDate: now.toISOString(),
            status: 'draft',
            taxRate: 0,
          };
          setEstimate(blankEstimate);
          setChapters([]);
          setLoading(false);
        } else {
          const estimateWithDetails = await estimateService.getEstimateWithDetails(id);
          if (!estimateWithDetails) {
            setError('Estimate not found');
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
        setError('Failed to load estimate. Please try again.');
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

  // Save estimate header
  const handleSaveHeader = async () => {
    if (!estimate) return;
    // Validate required fields
    if (!estimate.customerId || !estimate.subject) {
      alert('Customer and Subject are required.');
      return;
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
        // For now just show success.
        alert('Estimate created successfully.');
      } else {
        // Update existing header
        await estimateService.updateEstimateHeader(estimate.id, estimate);
        alert('Estimate header updated.');
      }
    } catch (err) {
      console.error('Failed to save estimate header:', err);
      alert('Failed to save estimate header.');
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
    try {
      if (editingChapterId) {
        // Update existing chapter
        await chapterRepository.update(editingChapterId, {
          ...chapterForm,
          estimateId: estimate.id,
        } as Chapter);
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
      alert('Failed to save chapter.');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) return;
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
      alert('Failed to delete chapter.');
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
      alert('Failed to save line item.');
    }
  };

  const handleDeleteLineItem = async (lineItemId: string) => {
    if (!window.confirm('Are you sure you want to delete this line item?')) return;
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
      alert('Failed to delete line item.');
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
    // Save header first
    await handleSaveHeader();
    // Chapters and line items are saved individually on their own actions.
    alert('Estimate saved.');
  };

  // Handle delete estimate
  const handleDeleteEstimate = async () => {
    if (!estimate) return;
    if (!window.confirm('Are you sure you want to delete this estimate?')) return;
    try {
      await estimateService.deleteEstimate(estimate.id);
      navigate('/estimates');
    } catch (err) {
      console.error('Failed to delete estimate:', err);
      alert('Failed to delete estimate.');
    }
  };

  if (loading) return <div>Loading estimate...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!estimate) return <div>Unexpected state.</div>;

  return (
    <div className="estimates-page">
      <h1>
        {estimate.id ? `Edit Estimate ${estimate.estimateNumber}` : 'New Estimate'}
      </h1>
      <div className="search-bar">
        <button onClick={() => navigate('/estimates')} className="add-button">
          Back to List
        </button>
        <button onClick={handleSaveEstimate} className="add-button">
          Save Estimate
        </button>
        <button
          onClick={handleDeleteEstimate}
          className="delete-button"
          style={{ marginLeft: '0.5rem' }}
        >
          Delete Estimate
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
                Year:
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
              <label>
                Customer:
                <select
                  value={estimate.customerId || ''}
                  onChange={(e) =>
                    handleEstimateChange('customerId', e.target.value)
                  }
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-group">
              <label>
                Subject:
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
                Site:
                <input
                  type="text"
                  value={estimate.site || ''}
                  onChange={(e) => handleEstimateChange('site', e.target.value)}
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                Creation Date:
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
                Status:
                <select
                  value={estimate.status || ''}
                  onChange={(e) => handleEstimateChange('status', e.target.value)}
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="accepted">Accepted</option>
                </select>
              </label>
            </div>
            <div className="form-group">
              <label>
                Tax Rate (%):
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
            <div className="form-actions">
              <button type="button" onClick={handleSaveHeader} className="submit-button">
                Save Header
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Chapters List */}
      <h2>Chapters</h2>
      <button onClick={() => openChapterModal(null)} className="add-button">
        Add Chapter
      </button>
      {chapters.length === 0 ? (
        <p>No chapters yet.</p>
      ) : (
        chapters.map((chapter) => (
          <div key={chapter.id} style={{ border: '1px solid #ccc', margin: '1rem 0', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{chapter.title}</h3>
              <div>
                <button
                  onClick={() => openChapterModal(chapter)}
                  className="actions-button"
                  style={{ marginRight: '0.25rem' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteChapter(chapter.id)}
                  className="delete-button"
                  style={{ marginRight: '0.25rem' }}
                >
                  Delete
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
            <h4>Line Items</h4>
            <button
              onClick={() => {
                openLineItemModal(null, chapter.id);
              }}
              className="add-button"
              style={{ marginBottom: '0.5rem' }}
            >
              Add Line Item
            </button>
            {chapter.lineItems.length === 0 ? (
              <p>No line items yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chapter.lineItems.map((item) => (
                    <tr key={item.id}>
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
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLineItem(item.id)}
                          className="delete-button"
                          style={{ marginRight: '0.25rem' }}
                        >
                          Delete
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
              Chapter Total: <strong>{calculateChapterTotal(chapter).toFixed(2)}</strong>
            </p>
          </div>
        ))
      )}

      <div style={{ marginTop: '2rem', fontWeight: 'bold', fontSize: '1.2em' }}>
        Estimate Total: <strong>{calculateEstimateTotal().toFixed(2)}</strong>
      </div>

      {/* Chapter Modal */}
      {chapterModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingChapterId ? 'Edit Chapter' : 'Add Chapter'}</h2>
            <form className="customer-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label>
                  Title:
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
                  Order:
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
                  Cancel
                </button>
                <button type="button" onClick={handleSaveChapter} className="submit-button">
                  {editingChapterId ? 'Update' : 'Create'}
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
            <h2>{editingLineItemId ? 'Edit Line Item' : 'Add Line Item'}</h2>
            <div className="form-group">
              <label>
                Insert from Library:
                <input
                  type="text"
                  placeholder="Search library items..."
                  value={librarySearchTerm}
                  onChange={(e) => setLibrarySearchTerm(e.target.value)}
                />
              </label>
              {librarySearchTerm && (
                <ul className="library-suggestions">
                  {filteredLibraryItems.length === 0 ? (
                    <li className="no-results">No matching items.</li>
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
                  Code:
                  <input
                    type="text"
                    value={lineItemForm.code || ''}
                    onChange={(e) => handleLineItemChange('code', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Description:
                  <input
                    type="text"
                    value={lineItemForm.description || ''}
                    onChange={(e) => handleLineItemChange('description', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Unit:
                  <input
                    type="text"
                    value={lineItemForm.unit || ''}
                    onChange={(e) => handleLineItemChange('unit', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Quantity:
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
                  Unit Price:
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
                  Amount:
                  <input
                    type="number"
                    value={lineItemForm.amount || ''}
                    readOnly
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Order:
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
                  Cancel
                </button>
                <button type="button" onClick={handleSaveLineItem} className="submit-button">
                  {editingLineItemId ? 'Update' : 'Create'}
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