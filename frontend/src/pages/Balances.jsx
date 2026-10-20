import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Receipt,
  Users,
  Wallet,
  HandCoins,
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import balanceService from '../services/balanceService';
import expenseService from '../services/expenseService';
import Badge from '../components/common/Badge';
import Alert from '../components/common/Alert';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import './Balances.css';

const Balances = () => {
  const { currentEventId, currentEvent, formatCurrency } = useEvent();
  const navigate = useNavigate();

  const [balances, setBalances] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBalances = useCallback(async () => {
    if (!currentEventId) {
      setBalances([]);
      setExpenses([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [balData, expData] = await Promise.all([
        balanceService.getBalances(currentEventId),
        expenseService.getExpenses(currentEventId),
      ]);
      setBalances(balData);
      setExpenses(expData);
    } catch (err) {
      console.error('Failed to load balances:', err);
      setError(err.message || 'Failed to calculate balances.');
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  if (!currentEventId) {
    return (
      <div className="balances-page animate-fade-in">
        <EmptyState
          icon={Calendar}
          title="No Event Selected"
          description="Select or create an event to see member balances."
          actionLabel="Go to Events"
          onAction={() => navigate('/events')}
        />
      </div>
    );
  }

  // Summary figures
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const avgShare = balances.length > 0 ? totalSpent / balances.length : 0;
  const owesList = balances.filter((b) => b.status === 'OWES');
  const getsBackList = balances.filter((b) => b.status === 'GETS_BACK');
  const settledList = balances.filter((b) => b.status === 'SETTLED');

  return (
    <div className="balances-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Balances</h1>
          <p className="page-subtitle">
            Net balance breakdown for <strong style={{ color: 'var(--primary-600)' }}>{currentEvent?.name}</strong>
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/settlements')}
          >
            <HandCoins size={16} /> View Settlements
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <LoadingSpinner message="Calculating member net balances..." />
      ) : balances.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No Balances Calculated"
          description="Add participants and record expenses to calculate who owes money and who gets reimbursed."
          actionLabel="Add Participants"
          onAction={() => navigate('/participants')}
        />
      ) : (
        <>
          {/* Summary KPI Strip */}
          <div className="balance-stats-strip">
            <div className="card balance-stat-card">
              <span className="stat-label">Total Spent</span>
              <h3 className="stat-value mono-amount text-slate-900">{formatCurrency(totalSpent)}</h3>
              <span className="stat-sub">{expenses.length} expense{expenses.length === 1 ? '' : 's'}</span>
            </div>

            <div className="card balance-stat-card">
              <span className="stat-label">Average per Person</span>
              <h3 className="stat-value mono-amount text-slate-900">{formatCurrency(avgShare)}</h3>
              <span className="stat-sub">Across {balances.length} member{balances.length === 1 ? '' : 's'}</span>
            </div>

            <div className="card balance-stat-card">
              <span className="stat-label">Members to Receive</span>
              <h3 className="stat-value text-emerald">{getsBackList.length}</h3>
              <span className="stat-sub">Will be reimbursed</span>
            </div>

            <div className="card balance-stat-card">
              <span className="stat-label">Members who Owe</span>
              <h3 className="stat-value text-rose">{owesList.length}</h3>
              <span className="stat-sub">Need to settle up</span>
            </div>
          </div>

          {/* Detailed Balances Table */}
          <div className="card balances-table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Total Paid</th>
                    <th>Total Share</th>
                    <th>Net Balance</th>
                    <th>Financial Status</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => {
                    const net = Number(b.netBalance || 0);
                    const paid = Number(b.totalPaid || 0);
                    const share = Number(b.totalShare || 0);

                    return (
                      <tr key={b.participantId}>
                        <td>
                          <div className="avatar-chip">
                            <div className="mini-avatar">
                              {b.participantName?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold">{b.participantName}</span>
                          </div>
                        </td>
                        <td className="mono-amount">{formatCurrency(paid)}</td>
                        <td className="mono-amount">{formatCurrency(share)}</td>
                        <td>
                          <span
                            className={`mono-amount balance-highlight ${
                              b.status === 'GETS_BACK'
                                ? 'text-emerald'
                                : b.status === 'OWES'
                                ? 'text-rose'
                                : 'text-slate'
                            }`}
                          >
                            {b.status === 'GETS_BACK' ? '+' : ''}
                            {formatCurrency(net)}
                          </span>
                        </td>
                        <td>
                          <Badge status={b.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Legend / Help Box */}
          <div className="balance-info-callout card">
            <h4 className="callout-title">Understanding Balances</h4>
            <p className="callout-text">
              <strong>Net Balance = Total Paid − Total Share.</strong>
              <br />
              Participants with a <span className="text-emerald">positive (+) balance</span> paid more than their fair share and are owed money back.
              Participants with a <span className="text-rose">negative (−) balance</span> owe money to the group.
              The system calculates minimal transactions on the <strong>Settlements</strong> tab to balance all accounts with the fewest payments possible.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Balances;
