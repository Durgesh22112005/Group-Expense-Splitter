import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  PlusCircle,
  Edit2,
  Trash2,
  Calendar,
  Users,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  Tag,
  DollarSign,
  UploadCloud,
  Eye,
  X,
  ExternalLink,
  Download,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import expenseService from '../services/expenseService';
import participantService from '../services/participantService';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import './Expenses.css';

const CATEGORIES = [
  'Food & Dining',
  'Travel & Transport',
  'Accommodation',
  'Entertainment',
  'Groceries',
  'Shopping',
  'Utilities',
  'General',
];

const Expenses = () => {
  const { currentEventId, currentEvent, formatCurrency, formatDate } = useEvent();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerId, setPayerId] = useState('');
  const [splitEquallyAll, setSplitEquallyAll] = useState(true);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState([]);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lightbox viewer state
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, expense: null });
  const [deleting, setDeleting] = useState(false);

  // Notification state
  const [alert, setAlert] = useState({ type: '', message: '' });

  const loadData = useCallback(async () => {
    if (!currentEventId) {
      setExpenses([]);
      setParticipants([]);
      return;
    }

    try {
      setLoading(true);
      const [exps, parts] = await Promise.all([
        expenseService.getExpenses(currentEventId),
        participantService.getParticipants(currentEventId),
      ]);
      setExpenses(exps);
      setParticipants(parts);
    } catch (err) {
      console.error('Failed to load expenses data:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Failed to load expenses for this event.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setDescription('');
    setCategory(CATEGORIES[0]);
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setPayerId(participants.length > 0 ? String(participants[0].id) : '');
    setSplitEquallyAll(true);
    setSelectedBeneficiaries(participants.map((p) => p.id));
    setReceiptUrl(null);
    setReceiptFileName('');
    setModalOpen(true);
  };

  const openEditModal = (exp) => {
    setEditingExpense(exp);
    setDescription(exp.description);
    setCategory(exp.category);
    setAmount(String(exp.amount));
    setExpenseDate(exp.expenseDate);
    setPayerId(String(exp.payerId));
    setReceiptUrl(exp.receiptUrl || null);
    setReceiptFileName(exp.receiptUrl ? 'Existing Bill Receipt' : '');

    const benIds = exp.shares ? exp.shares.map((s) => s.participantId) : [];
    if (benIds.length === participants.length || benIds.length === 0) {
      setSplitEquallyAll(true);
      setSelectedBeneficiaries(participants.map((p) => p.id));
    } else {
      setSplitEquallyAll(false);
      setSelectedBeneficiaries(benIds);
    }
    setModalOpen(true);
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setAlert({
        type: 'error',
        message: 'Invalid file format. Please upload a PNG, JPG, WEBP screenshot or PDF receipt.',
      });
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setAlert({
        type: 'error',
        message: 'File size exceeds 5MB. Please upload an image or bill under 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptUrl(e.target.result);
      setReceiptFileName(file.name);
    };
    reader.onerror = () => {
      setAlert({ type: 'error', message: 'Failed to read bill file. Please try again.' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl(null);
    setReceiptFileName('');
    const input = document.getElementById('receipt-file-input');
    if (input) input.value = '';
  };

  const toggleBeneficiary = (pId) => {
    setSplitEquallyAll(false);
    setSelectedBeneficiaries((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const handleSplitAllToggle = () => {
    if (!splitEquallyAll) {
      setSplitEquallyAll(true);
      setSelectedBeneficiaries(participants.map((p) => p.id));
    } else {
      setSplitEquallyAll(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      setAlert({ type: 'error', message: 'Description is required.' });
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAlert({ type: 'error', message: 'Amount must be greater than zero.' });
      return;
    }
    if (!payerId) {
      setAlert({ type: 'error', message: 'Please select who paid this expense.' });
      return;
    }
    if (!splitEquallyAll && selectedBeneficiaries.length === 0) {
      setAlert({ type: 'error', message: 'Please select at least one beneficiary for the split.' });
      return;
    }

    const payload = {
      description: description.trim(),
      category: category.trim(),
      amount: parsedAmount.toFixed(2),
      expenseDate,
      payerId: Number(payerId),
      beneficiaryIds: splitEquallyAll ? null : selectedBeneficiaries,
      receiptUrl: receiptUrl || null,
    };

    try {
      setSubmitting(true);
      if (editingExpense) {
        await expenseService.updateExpense(currentEventId, editingExpense.id, payload);
        setAlert({
          type: 'success',
          message: `Expense "${payload.description}" updated and settlements recalculated!`,
        });
      } else {
        await expenseService.createExpense(currentEventId, payload);
        setAlert({
          type: 'success',
          message: `Expense "${payload.description}" recorded successfully with attached proof!`,
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to save expense.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteDialog.expense) return;

    try {
      setDeleting(true);
      await expenseService.deleteExpense(currentEventId, deleteDialog.expense.id);
      setAlert({
        type: 'success',
        message: `Deleted expense "${deleteDialog.expense.description}". Settlements updated.`,
      });
      setDeleteDialog({ isOpen: false, expense: null });
      await loadData();
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to delete expense.',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!currentEventId) {
    return (
      <div className="expenses-page animate-fade-in">
        <EmptyState
          icon={Calendar}
          title="No Event Selected"
          description="Please select or create an event to view and record shared expenses."
          actionLabel="Go to Events"
          onAction={() => navigate('/events')}
        />
      </div>
    );
  }

  const filteredExpenses = expenses.filter((exp) => {
    const matchSearch =
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.payerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const totalFilteredAmount = filteredExpenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0
  );

  return (
    <div className="expenses-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Management</h1>
          <p className="page-subtitle">
            Shared spending for <strong style={{ color: 'var(--primary-600)' }}>{currentEvent?.name}</strong>
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
            disabled={participants.length === 0}
            title={participants.length === 0 ? 'Add participants first' : 'Record an expense'}
          >
            <PlusCircle size={16} /> Add Expense
          </button>
        </div>
      </div>

      {alert.message && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ type: '', message: '' })}
        />
      )}

      {participants.length === 0 && (
        <Alert
          type="warning"
          title="Participants Needed"
          message="You need at least one participant in this event before you can record shared expenses."
        />
      )}

      {/* Toolbar / Search / Filter */}
      {expenses.length > 0 && (
        <div className="expenses-toolbar card">
          <div className="toolbar-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search expenses or payer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="toolbar-filter">
            <Filter size={16} className="filter-icon" />
            <select
              className="category-dropdown"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-summary">
            <span className="summary-label">Filtered Total:</span>
            <span className="summary-amount mono-amount">
              {formatCurrency(totalFilteredAmount)}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading expense history..." />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No Expenses Recorded"
          description="Track who paid for hotel, dinners, tickets, or groceries and let SplitWise Pro compute the exact shares."
          actionLabel={participants.length > 0 ? 'Add Expense' : 'Add Participants First'}
          onAction={participants.length > 0 ? openCreateModal : () => navigate('/participants')}
        />
      ) : filteredExpenses.length === 0 ? (
        <div className="card empty-search">
          <p>No expenses match your search or category filter.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="expenses-list">
          {filteredExpenses.map((exp) => (
            <div key={exp.id} className="card expense-card">
              <div className="expense-card-main">
                <div className="expense-left">
                  <div className="category-icon-box">
                    <Tag size={20} />
                  </div>
                  <div>
                    <div className="expense-title-row">
                      <h3 className="expense-desc">{exp.description}</h3>
                      <span className="category-pill">{exp.category}</span>
                      {exp.receiptUrl && (
                        <button
                          type="button"
                          className="receipt-pill-btn"
                          title="Click to view verified bill receipt"
                          onClick={() => setViewingReceipt(exp)}
                        >
                          <Receipt size={13} />
                          <span>Bill Attached</span>
                        </button>
                      )}
                    </div>

                    <div className="expense-meta-row">
                      <span className="expense-payer">
                        Paid by <strong>{exp.payerName}</strong>
                      </span>
                      <span className="meta-dot">•</span>
                      <span className="expense-date">{formatDate(exp.expenseDate)}</span>
                      <span className="meta-dot">•</span>
                      <span className="expense-share-count">
                        Split among {exp.shares?.length || 0} person{exp.shares?.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="expense-right">
                  <div className="expense-amount-box">
                    <span className="expense-amount mono-amount">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>

                  <div className="expense-actions">
                    {exp.receiptUrl && (
                      <button
                        type="button"
                        className="btn-icon receipt-icon-btn"
                        title="View Bill Receipt Screenshot"
                        onClick={() => setViewingReceipt(exp)}
                      >
                        <Eye size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-icon"
                      title="Edit Expense"
                      onClick={() => openEditModal(exp)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger"
                      title="Delete Expense"
                      onClick={() => setDeleteDialog({ isOpen: true, expense: exp })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Shares Breakdown Accordion */}
              {exp.shares && exp.shares.length > 0 && (
                <div className="shares-breakdown">
                  <span className="shares-label">Share Breakdown:</span>
                  <div className="shares-chips">
                    {exp.shares.map((s) => (
                      <span key={s.participantId} className="share-chip">
                        {s.participantName}: <strong className="mono-amount">{formatCurrency(s.shareAmount)}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Record New Expense'}
        subtitle={`Split expenses across members of "${currentEvent?.name}"`}
        maxWidth="640px"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="expense-desc">
              Description <span style={{ color: 'var(--rose-600)' }}>*</span>
            </label>
            <input
              id="expense-desc"
              type="text"
              className="form-input"
              placeholder="e.g. Italian Bistro Dinner, Taxi Fare"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="expense-amount">
                Amount (₹) <span style={{ color: 'var(--rose-600)' }}>*</span>
              </label>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input mono-amount"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="expense-category">
                Category <span style={{ color: 'var(--rose-600)' }}>*</span>
              </label>
              <select
                id="expense-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="expense-payer">
                Paid By <span style={{ color: 'var(--rose-600)' }}>*</span>
              </label>
              <select
                id="expense-payer"
                className="form-select"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                disabled={submitting}
                required
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="expense-date">
                Date <span style={{ color: 'var(--rose-600)' }}>*</span>
              </label>
              <input
                id="expense-date"
                type="date"
                className="form-input"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Bill Receipt Upload Segment */}
          <div className="form-group receipt-form-section">
            <div className="receipt-section-header">
              <label className="form-label" style={{ marginBottom: 0 }}>
                Bill Receipt / Payment Screenshot
              </label>
              <span className="receipt-badge-optional">Optional • Builds Trust</span>
            </div>
            <p className="receipt-section-hint">
              Attach a digital bill, restaurant receipt, or UPI/bank payment screenshot so group members can verify the spend.
            </p>

            {!receiptUrl ? (
              <div
                className={`receipt-dropzone ${isDragging ? 'is-dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => document.getElementById('receipt-file-input').click()}
              >
                <input
                  id="receipt-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="dropzone-icon-circle">
                  <UploadCloud size={24} />
                </div>
                <div className="dropzone-copy">
                  <span className="dropzone-primary-text">Click to upload or drag & drop</span>
                  <span className="dropzone-secondary-text">PNG, JPG, WEBP screenshot or PDF invoice (max 5MB)</span>
                </div>
              </div>
            ) : (
              <div className="receipt-preview-card">
                <div className="receipt-preview-left">
                  {receiptUrl.startsWith('data:application/pdf') ? (
                    <div className="doc-icon-box">
                      <FileText size={28} />
                    </div>
                  ) : (
                    <img src={receiptUrl} alt="Bill thumbnail" className="receipt-thumbnail-img" />
                  )}
                  <div className="receipt-file-info">
                    <span className="receipt-file-title">
                      {receiptFileName || (editingExpense ? 'Attached Bill Proof' : 'Payment Screenshot')}
                    </span>
                    <span className="receipt-file-status">
                      <CheckCircle size={12} style={{ color: 'var(--emerald-600)' }} /> Ready to be saved with expense
                    </span>
                  </div>
                </div>

                <div className="receipt-preview-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setViewingReceipt({
                        description: description || 'Receipt Preview',
                        receiptUrl,
                        payerName: participants.find((p) => String(p.id) === String(payerId))?.name || 'You',
                      })
                    }
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <button
                    type="button"
                    className="btn-icon danger"
                    title="Remove Receipt"
                    onClick={handleRemoveReceipt}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Beneficiaries Selection */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <div className="split-header">
              <label className="form-label" style={{ margin: 0 }}>
                Split With (Beneficiaries)
              </label>
              <button
                type="button"
                className="btn-text-toggle"
                onClick={handleSplitAllToggle}
              >
                {splitEquallyAll ? 'Customize Beneficiaries' : 'Split Equally with All'}
              </button>
            </div>

            {splitEquallyAll ? (
              <div className="split-all-banner">
                <Users size={16} />
                <span>Split equally among all {participants.length} event members</span>
              </div>
            ) : (
              <div className="beneficiaries-list">
                {participants.map((p) => {
                  const isChecked = selectedBeneficiaries.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`beneficiary-item ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleBeneficiary(p.id)}
                    >
                      {isChecked ? (
                        <CheckSquare size={18} className="checkbox-icon checked" />
                      ) : (
                        <Square size={18} className="checkbox-icon" />
                      )}
                      <span>{p.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bill Receipt Lightbox Modal */}
      <Modal
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        title="Verified Expense Receipt"
        subtitle={
          viewingReceipt
            ? `${viewingReceipt.description} • Paid by ${viewingReceipt.payerName}`
            : ''
        }
        maxWidth="680px"
      >
        {viewingReceipt && (
          <div className="receipt-lightbox-container">
            {viewingReceipt.receiptUrl?.startsWith('data:application/pdf') ? (
              <div className="pdf-lightbox-content">
                <FileText size={56} className="pdf-large-icon" />
                <h4 className="pdf-title">PDF Document Attached</h4>
                <p className="pdf-desc">
                  This transaction has a verified PDF invoice or bill receipt attached.
                </p>
                <a
                  href={viewingReceipt.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ marginTop: '12px' }}
                >
                  <ExternalLink size={16} /> Open PDF in Full Window
                </a>
              </div>
            ) : (
              <div className="image-lightbox-wrapper">
                <img
                  src={viewingReceipt.receiptUrl}
                  alt={`Receipt for ${viewingReceipt.description}`}
                  className="receipt-lightbox-img"
                />
              </div>
            )}

            <div className="receipt-lightbox-footer">
              <div className="receipt-footer-meta">
                <CheckCircle size={15} style={{ color: 'var(--emerald-600)' }} />
                <span>Uploaded bill proof for transparency and dispute prevention</span>
              </div>
              <div className="receipt-footer-buttons">
                {viewingReceipt.receiptUrl && !viewingReceipt.receiptUrl.startsWith('data:application/pdf') && (
                  <a
                    href={viewingReceipt.receiptUrl}
                    download={`bill-${viewingReceipt.description || 'receipt'}.png`}
                    className="btn btn-secondary btn-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={14} /> Download
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setViewingReceipt(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Expense Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, expense: null })}
        onConfirm={handleDeleteExpense}
        title="Delete Expense?"
        message={`Are you sure you want to delete "${deleteDialog.expense?.description}" for ${formatCurrency(deleteDialog.expense?.amount)}? All associated shares and pending settlements will be recalculated.`}
        confirmLabel="Yes, Delete Expense"
        isLoading={deleting}
      />
    </div>
  );
};

export default Expenses;
