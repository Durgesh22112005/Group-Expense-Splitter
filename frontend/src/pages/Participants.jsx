import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Trash2,
  Calendar,
  AlertCircle,
  Receipt,
  Scale,
  Search,
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import participantService from '../services/participantService';
import balanceService from '../services/balanceService';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import './Participants.css';

const Participants = () => {
  const { currentEventId, currentEvent, formatCurrency, formatDate } = useEvent();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Participant state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Remove Participant state
  const [removeDialog, setRemoveDialog] = useState({ isOpen: false, participant: null });
  const [removing, setRemoving] = useState(false);

  // Notification state
  const [alert, setAlert] = useState({ type: '', message: '' });

  const loadParticipantsData = useCallback(async () => {
    if (!currentEventId) {
      setParticipants([]);
      setBalances([]);
      return;
    }

    try {
      setLoading(true);
      const [parts, bals] = await Promise.all([
        participantService.getParticipants(currentEventId),
        balanceService.getBalances(currentEventId).catch(() => []),
      ]);
      setParticipants(parts);
      setBalances(bals);
    } catch (err) {
      console.error('Failed to load participants:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Failed to load participants for this event.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    loadParticipantsData();
  }, [loadParticipantsData]);

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    if (!participantName.trim()) {
      setAlert({ type: 'error', message: 'Participant name is required.' });
      return;
    }

    try {
      setSubmitting(true);
      const newPart = await participantService.addParticipant(currentEventId, {
        name: participantName.trim(),
      });
      setParticipantName('');
      setAddModalOpen(false);
      setAlert({
        type: 'success',
        message: `Added "${newPart.name}" to the event!`,
      });
      await loadParticipantsData();
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to add participant.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveParticipant = async () => {
    if (!removeDialog.participant) return;

    try {
      setRemoving(true);
      await participantService.removeParticipant(
        currentEventId,
        removeDialog.participant.id
      );
      setAlert({
        type: 'success',
        message: `Removed "${removeDialog.participant.name}" from event.`,
      });
      setRemoveDialog({ isOpen: false, participant: null });
      await loadParticipantsData();
    } catch (err) {
      // Backend business rule exception (e.g. participant has active expenses or settlements)
      setAlert({
        type: 'error',
        message: err.message || 'Cannot remove participant because they have existing expense or settlement records.',
      });
      setRemoveDialog({ isOpen: false, participant: null });
    } finally {
      setRemoving(false);
    }
  };

  if (!currentEventId) {
    return (
      <div className="participants-page animate-fade-in">
        <EmptyState
          icon={Calendar}
          title="No Event Selected"
          description="Please select or create an event first to manage its group participants."
          actionLabel="Go to Events"
          onAction={() => navigate('/events')}
        />
      </div>
    );
  }

  const balanceMap = {};
  balances.forEach((b) => {
    balanceMap[b.participantId] = b;
  });

  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="participants-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Event Participants</h1>
          <p className="page-subtitle">
            Members participating in <strong style={{ color: 'var(--primary-600)' }}>{currentEvent?.name}</strong>
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAddModalOpen(true)}
          >
            <UserPlus size={16} /> Add Member
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

      {loading ? (
        <LoadingSpinner message="Loading event participants..." />
      ) : participants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Participants in this Event"
          description="Add friends, colleagues, or flatmates who will be sharing expenses in this event."
          actionLabel="Add First Member"
          onAction={() => setAddModalOpen(true)}
        />
      ) : (
        <div className="card participants-table-card">
          <div className="participants-table-toolbar">
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search member by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <span className="participants-count-chip">
              Total {participants.length} member{participants.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Total Paid</th>
                  <th>Total Share</th>
                  <th>Net Balance</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((part) => {
                  const bal = balanceMap[part.id];
                  const net = bal ? Number(bal.netBalance) : 0;
                  const paid = bal ? Number(bal.totalPaid) : 0;
                  const share = bal ? Number(bal.totalShare) : 0;

                  return (
                    <tr key={part.id}>
                      <td>
                        <div className="participant-cell">
                          <div className="participant-avatar">
                            {part.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="participant-name-text">{part.name}</span>
                            <span className="participant-id-subtext">ID: #{part.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="mono-amount">{formatCurrency(paid)}</td>
                      <td className="mono-amount">{formatCurrency(share)}</td>
                      <td>
                        <span
                          className={`mono-amount font-semibold ${
                            net > 0 ? 'text-emerald' : net < 0 ? 'text-rose' : 'text-slate'
                          }`}
                        >
                          {net > 0 ? '+' : ''}
                          {formatCurrency(net)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-icon danger"
                          title="Remove Participant"
                          onClick={() => setRemoveDialog({ isOpen: true, participant: part })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Participant"
        subtitle={`Add a new person to "${currentEvent?.name}"`}
      >
        <form onSubmit={handleAddParticipant}>
          <div className="form-group">
            <label className="form-label" htmlFor="member-name">
              Full Name <span style={{ color: 'var(--rose-600)' }}>*</span>
            </label>
            <input
              id="member-name"
              type="text"
              className="form-input"
              placeholder="e.g. Alice Sharma, Rahul, John"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              disabled={submitting}
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAddModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove Participant Dialog */}
      <ConfirmDialog
        isOpen={removeDialog.isOpen}
        onClose={() => setRemoveDialog({ isOpen: false, participant: null })}
        onConfirm={handleRemoveParticipant}
        title="Remove Participant?"
        message={`Are you sure you want to remove "${removeDialog.participant?.name}" from this event? Note: Participants who have already paid for expenses or are part of expense shares cannot be removed.`}
        confirmLabel="Remove Member"
        isLoading={removing}
      />
    </div>
  );
};

export default Participants;
