import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HandCoins,
  ArrowRight,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import settlementService from '../services/settlementService';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import './Settlements.css';

const Settlements = () => {
  const { currentEventId, currentEvent, formatCurrency, formatDate } = useEvent();
  const navigate = useNavigate();

  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Complete settlement confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, settlement: null });

  // Notification state
  const [alert, setAlert] = useState({ type: '', message: '' });

  const loadSettlements = useCallback(async () => {
    if (!currentEventId) {
      setSettlements([]);
      return;
    }

    try {
      setLoading(true);
      const data = await settlementService.getSettlements(currentEventId);
      setSettlements(data);
    } catch (err) {
      console.error('Failed to load settlements:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Failed to load settlements for this event.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const handleCompleteSettlement = async () => {
    if (!confirmDialog.settlement) return;

    try {
      setCompleting(true);
      await settlementService.completeSettlement(confirmDialog.settlement.id);
      setAlert({
        type: 'success',
        message: `Settlement of ${formatCurrency(confirmDialog.settlement.amount)} from ${
          confirmDialog.settlement.payerName
        } to ${confirmDialog.settlement.receiverName} marked as completed!`,
      });
      setConfirmDialog({ isOpen: false, settlement: null });
      await loadSettlements();
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to complete settlement.',
      });
    } finally {
      setCompleting(false);
    }
  };

  if (!currentEventId) {
    return (
      <div className="settlements-page animate-fade-in">
        <EmptyState
          icon={Calendar}
          title="No Event Selected"
          description="Please select or create an event to view suggested settlements."
          actionLabel="Go to Events"
          onAction={() => navigate('/events')}
        />
      </div>
    );
  }

  const pendingSettlements = settlements.filter((s) => s.status === 'PENDING');
  const completedSettlements = settlements.filter((s) => s.status === 'COMPLETED');

  const totalPendingAmount = pendingSettlements.reduce(
    (acc, s) => acc + Number(s.amount || 0),
    0
  );

  return (
    <div className="settlements-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlement Management</h1>
          <p className="page-subtitle">
            Optimal debt simplification for <strong style={{ color: 'var(--primary-600)' }}>{currentEvent?.name}</strong>
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadSettlements}
            disabled={loading}
          >
            Refresh Suggestions
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
        <LoadingSpinner message="Calculating optimal settlements..." />
      ) : settlements.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No Settlements Needed"
          description="All expenses in this event are perfectly balanced or no expenses have been recorded yet."
          actionLabel="Add an Expense"
          onAction={() => navigate('/expenses')}
        />
      ) : (
        <div className="settlements-container">
          {/* Algorithm Banner */}
          <div className="algorithm-callout card">
            <div className="callout-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="callout-headline">Greedy Debt Simplification Active</h4>
              <p className="callout-description">
                The backend algorithm matches the largest net debtors directly with the largest net creditors, minimizing the total number of payments needed to zero out all balances.
              </p>
            </div>
          </div>

          {/* Pending Settlements Section */}
          <div className="settlement-group">
            <div className="group-header">
              <div className="group-title-row">
                <Clock size={18} className="text-amber" />
                <h3 className="group-title">Pending Settlements</h3>
                <span className="badge badge-amber">{pendingSettlements.length}</span>
              </div>
              {pendingSettlements.length > 0 && (
                <span className="group-total mono-amount">
                  Total Outstanding: <strong>{formatCurrency(totalPendingAmount)}</strong>
                </span>
              )}
            </div>

            {pendingSettlements.length === 0 ? (
              <div className="card empty-subgroup">
                <CheckCircle2 size={24} className="text-emerald" />
                <p>All settlements for this event are fully resolved!</p>
              </div>
            ) : (
              <div className="settlement-cards-list">
                {pendingSettlements.map((s) => (
                  <div key={s.id} className="card settlement-card">
                    <div className="settlement-flow">
                      <div className="person-box payer">
                        <div className="person-avatar payer-avatar">
                          {s.payerName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="person-role">Owes Money</span>
                          <span className="person-name">{s.payerName}</span>
                        </div>
                      </div>

                      <div className="transfer-arrow-box">
                        <span className="transfer-amount mono-amount">
                          {formatCurrency(s.amount)}
                        </span>
                        <div className="arrow-line">
                          <ArrowRight size={20} />
                        </div>
                      </div>

                      <div className="person-box receiver">
                        <div className="person-avatar receiver-avatar">
                          {s.receiverName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="person-role">Receives Money</span>
                          <span className="person-name">{s.receiverName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="settlement-action-bar">
                      <Badge status={s.status} />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setConfirmDialog({ isOpen: true, settlement: s })}
                      >
                        <CheckCircle2 size={15} /> Mark as Settled
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Settlements Section */}
          {completedSettlements.length > 0 && (
            <div className="settlement-group" style={{ marginTop: '16px' }}>
              <div className="group-header">
                <div className="group-title-row">
                  <CheckCircle2 size={18} className="text-emerald" />
                  <h3 className="group-title">Completed Settlements</h3>
                  <span className="badge badge-emerald">{completedSettlements.length}</span>
                </div>
              </div>

              <div className="card completed-table-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Payer</th>
                        <th>Receiver</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Settled At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSettlements.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <span className="font-semibold">{s.payerName}</span>
                          </td>
                          <td>
                            <span className="font-semibold">{s.receiverName}</span>
                          </td>
                          <td className="mono-amount font-semibold">{formatCurrency(s.amount)}</td>
                          <td>
                            <Badge status={s.status} />
                          </td>
                          <td className="text-muted">
                            {s.completedAt ? formatDate(s.completedAt) : 'Completed'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, settlement: null })}
        onConfirm={handleCompleteSettlement}
        title="Confirm Settlement Completion"
        message={`Has ${confirmDialog.settlement?.payerName} paid ${formatCurrency(
          confirmDialog.settlement?.amount
        )} to ${confirmDialog.settlement?.receiverName}? This will mark the transaction as COMPLETED.`}
        confirmLabel="Confirm Payment"
        isDanger={false}
        isLoading={completing}
      />
    </div>
  );
};

export default Settlements;
