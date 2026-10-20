import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  PlusCircle,
  Trash2,
  Users,
  CheckCircle,
  Calendar,
  ExternalLink,
  Receipt,
  Search,
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import eventService from '../services/eventService';
import participantService from '../services/participantService';
import expenseService from '../services/expenseService';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import './Events.css';

const Events = () => {
  const { events, currentEventId, selectEvent, refreshEvents, formatCurrency, formatDate } = useEvent();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [eventStats, setEventStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Create Event state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Delete Event state
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, event: null });
  const [deleting, setDeleting] = useState(false);

  // Notification state
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Load participant count and total expenses for each event
  useEffect(() => {
    const fetchStats = async () => {
      if (events.length === 0) return;
      try {
        const statsMap = {};
        await Promise.all(
          events.map(async (ev) => {
            try {
              const [parts, exps] = await Promise.all([
                participantService.getParticipants(ev.id),
                expenseService.getExpenses(ev.id),
              ]);
              const totalAmount = exps.reduce((acc, e) => acc + Number(e.amount || 0), 0);
              statsMap[ev.id] = {
                participantCount: parts.length,
                expenseCount: exps.length,
                totalAmount,
              };
            } catch (e) {
              statsMap[ev.id] = { participantCount: 0, expenseCount: 0, totalAmount: 0 };
            }
          })
        );
        setEventStats(statsMap);
      } catch (err) {
        console.error('Error loading event stats:', err);
      }
    };

    fetchStats();
  }, [events]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setAlert({ type: 'error', message: 'Event name is required.' });
      return;
    }
    if (!eventDate) {
      setAlert({ type: 'error', message: 'Event date is required.' });
      return;
    }

    try {
      setSubmitting(true);
      const created = await eventService.createEvent({
        name: name.trim(),
        eventDate,
      });
      await refreshEvents();
      selectEvent(created.id);
      setCreateModalOpen(false);
      setName('');
      setAlert({
        type: 'success',
        message: `Event "${created.name}" created successfully!`,
      });
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to create event.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.event) return;

    try {
      setDeleting(true);
      await eventService.deleteEvent(deleteDialog.event.id);
      await refreshEvents();
      setAlert({
        type: 'success',
        message: `Event "${deleteDialog.event.name}" and associated records deleted successfully.`,
      });
      setDeleteDialog({ isOpen: false, event: null });
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to delete event.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAndManage = (eventId, targetPath = '/expenses') => {
    selectEvent(eventId);
    navigate(targetPath);
  };

  const filteredEvents = events.filter((ev) =>
    ev.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="events-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Event Management</h1>
          <p className="page-subtitle">Create and manage your trips, gatherings, and group budgets</p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <PlusCircle size={16} /> New Event
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

      {/* Filter Toolbar */}
      {events.length > 0 && (
        <div className="events-toolbar">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search events by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <span className="events-count">
            Showing {filteredEvents.length} of {events.length} events
          </span>
        </div>
      )}

      {/* Events Grid */}
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No Events Yet"
          description="Create your first group event to begin splitting expenses with friends, colleagues, or flatmates."
          actionLabel="Create Event"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : filteredEvents.length === 0 ? (
        <div className="card empty-search">
          <p>No events found matching "{searchTerm}"</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchTerm('')}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map((ev) => {
            const isSelected = ev.id === currentEventId;
            const stats = eventStats[ev.id] || { participantCount: 0, expenseCount: 0, totalAmount: 0 };

            return (
              <div
                key={ev.id}
                className={`card event-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="event-card-top">
                  <div>
                    <div className="event-badge-row">
                      {isSelected && (
                        <span className="badge badge-emerald">
                          <CheckCircle size={12} /> Active
                        </span>
                      )}
                      <span className="event-date-chip">
                        <Calendar size={13} /> {formatDate(ev.eventDate)}
                      </span>
                    </div>
                    <h3 className="event-card-name">{ev.name}</h3>
                  </div>

                  <button
                    type="button"
                    className="btn-icon danger"
                    title="Delete Event"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialog({ isOpen: true, event: ev });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="event-metrics">
                  <div className="metric-box">
                    <span className="metric-label">Members</span>
                    <span className="metric-val">
                      <Users size={14} /> {stats.participantCount}
                    </span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Expenses</span>
                    <span className="metric-val">
                      <Receipt size={14} /> {stats.expenseCount}
                    </span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Total Spent</span>
                    <span className="metric-val mono-amount">
                      {formatCurrency(stats.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="event-card-actions">
                  <button
                    type="button"
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm full-width`}
                    onClick={() => handleSelectAndManage(ev.id, '/expenses')}
                  >
                    {isSelected ? 'Manage Expenses' : 'Select & Manage'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    title="View Balances"
                    onClick={() => handleSelectAndManage(ev.id, '/balances')}
                  >
                    Balances
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Event"
        subtitle="Set up a new event for shared expenses"
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label" htmlFor="ev-name">
              Event Name <span style={{ color: 'var(--rose-600)' }}>*</span>
            </label>
            <input
              id="ev-name"
              type="text"
              className="form-input"
              placeholder="e.g. Road Trip to Manali, Monthly Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ev-date">
              Event Date <span style={{ color: 'var(--rose-600)' }}>*</span>
            </label>
            <input
              id="ev-date"
              type="date"
              className="form-input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, event: null })}
        onConfirm={handleDelete}
        title="Delete Event?"
        message={`Are you sure you want to delete "${deleteDialog.event?.name}"? All associated participants, expenses, and settlements will be permanently deleted.`}
        confirmLabel="Yes, Delete Event"
        isLoading={deleting}
      />
    </div>
  );
};

export default Events;
