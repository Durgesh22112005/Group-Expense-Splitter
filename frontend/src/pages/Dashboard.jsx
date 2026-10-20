import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Users,
  Calendar,
  Receipt,
  Scale,
  HandCoins,
  PlusCircle,
  ArrowRight,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  CalendarDays,
} from 'lucide-react';
import { useEvent } from '../context/EventContext';
import expenseService from '../services/expenseService';
import participantService from '../services/participantService';
import balanceService from '../services/balanceService';
import settlementService from '../services/settlementService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import './Dashboard.css';

const Dashboard = () => {
  const { events, currentEventId, currentEvent, formatCurrency, formatDate } = useEvent();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);

  const loadDashboardData = useCallback(async () => {
    if (!currentEventId) {
      setParticipants([]);
      setExpenses([]);
      setBalances([]);
      setSettlements([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [partsData, expData, balData, settsData] = await Promise.all([
        participantService.getParticipants(currentEventId),
        expenseService.getExpenses(currentEventId),
        balanceService.getBalances(currentEventId),
        settlementService.getSettlements(currentEventId),
      ]);

      setParticipants(partsData);
      setExpenses(expData);
      setBalances(balData);
      setSettlements(settsData);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived metrics
  const totalExpenseAmount = expenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0
  );

  const pendingSettlements = settlements.filter((s) => s.status === 'PENDING');
  const completedSettlements = settlements.filter((s) => s.status === 'COMPLETED');

  const totalOwedAmount = pendingSettlements.reduce(
    (sum, s) => sum + Number(s.amount || 0),
    0
  );

  // If there are no events at all
  if (events.length === 0) {
    return (
      <div className="dashboard-page animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Financial Dashboard</h1>
            <p className="page-subtitle">Track, split, and simplify group expenses</p>
          </div>
        </div>
        <EmptyState
          icon={Calendar}
          title="No Events Found"
          description="Create your first event (like a trip, dinner, or shared apartment) to start tracking and splitting group expenses."
          actionLabel="Create First Event"
          onAction={() => navigate('/events')}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Dashboard</h1>
          <p className="page-subtitle">
            Overview for <strong style={{ color: 'var(--primary-600)' }}>{currentEvent ? currentEvent.name : 'All Events'}</strong>
            {currentEvent && ` (${formatDate(currentEvent.eventDate)})`}
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/participants')}
            disabled={!currentEventId}
          >
            <Users size={16} /> Manage Members
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/expenses')}
            disabled={!currentEventId}
          >
            <PlusCircle size={16} /> Add Expense
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <LoadingSpinner message="Calculating financial metrics..." />
      ) : (
        <>
          {/* KPI Stat Cards Grid */}
          <div className="kpi-grid">
            <div className="card kpi-card">
              <div className="kpi-icon-wrapper primary">
                <Wallet size={22} />
              </div>
              <div>
                <span className="kpi-label">Total Expenses</span>
                <h3 className="kpi-value mono-amount">{formatCurrency(totalExpenseAmount)}</h3>
                <span className="kpi-subtext">{expenses.length} transaction{expenses.length === 1 ? '' : 's'} recorded</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon-wrapper amber">
                <TrendingDown size={22} />
              </div>
              <div>
                <span className="kpi-label">Pending Settlements</span>
                <h3 className="kpi-value mono-amount">{formatCurrency(totalOwedAmount)}</h3>
                <span className="kpi-subtext">{pendingSettlements.length} settlement{pendingSettlements.length === 1 ? '' : 's'} to resolve</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon-wrapper emerald">
                <Users size={22} />
              </div>
              <div>
                <span className="kpi-label">Active Members</span>
                <h3 className="kpi-value">{participants.length}</h3>
                <span className="kpi-subtext">Participants in this event</span>
              </div>
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon-wrapper indigo">
                <CalendarDays size={22} />
              </div>
              <div>
                <span className="kpi-label">Total Events</span>
                <h3 className="kpi-value">{events.length}</h3>
                <span className="kpi-subtext">Active expense groups</span>
              </div>
            </div>
          </div>

          {/* Main 2-column Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Left Column: Recent Expenses */}
            <div className="card dashboard-section">
              <div className="section-header">
                <div>
                  <h3 className="section-title">Recent Expenses</h3>
                  <p className="section-desc">Latest shared spending in this event</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/expenses')}
                >
                  View All <ArrowRight size={14} />
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="section-empty">
                  <Receipt size={32} className="empty-icon" />
                  <p>No expenses added to this event yet.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '12px' }}
                    onClick={() => navigate('/expenses')}
                  >
                    Add First Expense
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Paid By</th>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.slice(0, 5).map((exp) => (
                        <tr key={exp.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="fw-semibold text-slate-900">{exp.description}</span>
                              {exp.receiptUrl && (
                                <span
                                  title="Verified bill receipt or payment screenshot attached"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    fontSize: '0.71875rem',
                                    fontWeight: 700,
                                    background: 'var(--emerald-50)',
                                    color: 'var(--emerald-700)',
                                    border: '1px solid var(--emerald-200)',
                                    borderRadius: 'var(--radius-full)',
                                  }}
                                >
                                  <Receipt size={11} /> Bill Proof
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="category-pill">{exp.category}</span>
                          </td>
                          <td>
                            <div className="avatar-chip">
                              <div className="mini-avatar">{exp.payerName?.charAt(0).toUpperCase()}</div>
                              <span>{exp.payerName}</span>
                            </div>
                          </td>
                          <td className="text-muted">{formatDate(exp.expenseDate)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="mono-amount font-semibold">{formatCurrency(exp.amount)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column: Participant Balances & Settlements Summary */}
            <div className="dashboard-side-col">
              {/* Member Balances Widget */}
              <div className="card dashboard-section">
                <div className="section-header">
                  <div>
                    <h3 className="section-title">Balance Summary</h3>
                    <p className="section-desc">Who owes vs who gets back</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/balances')}
                  >
                    Details <ArrowRight size={14} />
                  </button>
                </div>

                {balances.length === 0 ? (
                  <div className="section-empty">
                    <Scale size={28} className="empty-icon" />
                    <p>Add participants and expenses to see net balances.</p>
                  </div>
                ) : (
                  <div className="balances-list">
                    {balances.map((b) => (
                      <div key={b.participantId} className="balance-item">
                        <div className="balance-user-info">
                          <div className="mini-avatar">{b.participantName?.charAt(0).toUpperCase()}</div>
                          <div>
                            <span className="balance-user-name">{b.participantName}</span>
                            <span className="balance-paid-text">
                              Paid {formatCurrency(b.totalPaid)} • Share {formatCurrency(b.totalShare)}
                            </span>
                          </div>
                        </div>

                        <div className="balance-status-block">
                          <span
                            className={`mono-amount balance-net ${
                              b.status === 'GETS_BACK'
                                ? 'text-emerald'
                                : b.status === 'OWES'
                                ? 'text-rose'
                                : 'text-slate'
                            }`}
                          >
                            {b.status === 'GETS_BACK' ? '+' : ''}
                            {formatCurrency(b.netBalance)}
                          </span>
                          <Badge status={b.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Settlement Suggestions Preview */}
              <div className="card dashboard-section">
                <div className="section-header">
                  <div>
                    <h3 className="section-title">Suggested Settlements</h3>
                    <p className="section-desc">Optimal debt simplification</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/settlements')}
                  >
                    Manage <ArrowRight size={14} />
                  </button>
                </div>

                {settlements.length === 0 ? (
                  <div className="section-empty">
                    <HandCoins size={28} className="empty-icon" />
                    <p>All debts are currently balanced or settled!</p>
                  </div>
                ) : (
                  <div className="settlements-mini-list">
                    {settlements.slice(0, 3).map((s) => (
                      <div key={s.id} className="settlement-mini-card">
                        <div className="settlement-parties">
                          <span className="party-name payer">{s.payerName}</span>
                          <span className="party-arrow">→</span>
                          <span className="party-name receiver">{s.receiverName}</span>
                        </div>
                        <div className="settlement-mini-amount">
                          <span className="mono-amount">{formatCurrency(s.amount)}</span>
                          <Badge status={s.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
