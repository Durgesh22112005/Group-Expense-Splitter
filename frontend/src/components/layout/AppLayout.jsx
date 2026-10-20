import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Receipt,
  Scale,
  HandCoins,
  Menu,
  X,
  PlusCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useEvent } from '../../context/EventContext';
import Modal from '../common/Modal';
import eventService from '../../services/eventService';
import Alert from '../common/Alert';
import './AppLayout.css';

const AppLayout = () => {
  const { events, currentEventId, currentEvent, selectEvent, refreshEvents, formatDate } = useEvent();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/events', label: 'Events', icon: CalendarDays },
    { to: '/participants', label: 'Participants', icon: Users },
    { to: '/expenses', label: 'Expenses', icon: Receipt },
    { to: '/balances', label: 'Balances', icon: Scale },
    { to: '/settlements', label: 'Settlements', icon: HandCoins },
  ];

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setErrorMsg('Event name is required');
      return;
    }
    if (!eventDate) {
      setErrorMsg('Event date is required');
      return;
    }

    try {
      setCreating(true);
      setErrorMsg('');
      const created = await eventService.createEvent({
        name: eventName.trim(),
        eventDate,
      });
      await refreshEvents();
      selectEvent(created.id);
      setCreateEventOpen(false);
      setEventName('');
      navigate('/events');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-wrapper">
            <Sparkles size={20} className="brand-icon" />
          </div>
          <div>
            <span className="brand-title">SplitWise Pro</span>
            <span className="brand-subtitle">Smart Group Splits</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">Menu</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Active Event Widget */}
        <div className="sidebar-footer">
          <div className="sidebar-event-widget">
            <span className="widget-label">ACTIVE EVENT</span>
            {currentEvent ? (
              <div className="widget-event-info">
                <span className="widget-event-name">{currentEvent.name}</span>
                <span className="widget-event-date">{formatDate(currentEvent.eventDate)}</span>
              </div>
            ) : (
              <div className="widget-no-event">No Event Selected</div>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm widget-btn"
              onClick={() => setCreateEventOpen(true)}
            >
              <PlusCircle size={14} /> New Event
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Layout */}
      <div className="app-main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Quick Event Selector Dropdown */}
            <div className="event-selector-container">
              <span className="event-selector-label">Event:</span>
              <div className="event-select-wrapper">
                <select
                  className="event-dropdown"
                  value={currentEventId || ''}
                  onChange={(e) => selectEvent(e.target.value)}
                  disabled={events.length === 0}
                >
                  {events.length === 0 ? (
                    <option value="">No events found</option>
                  ) : (
                    events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({formatDate(ev.eventDate)})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown size={14} className="dropdown-chevron" />
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setCreateEventOpen(true)}
            >
              <PlusCircle size={16} />
              <span>Create Event</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="content-area">
          <Outlet />
        </main>
      </div>

      {/* Quick Create Event Modal */}
      <Modal
        isOpen={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
        title="Create New Event"
        subtitle="Organize trips, parties, or household expenses with group members"
      >
        <form onSubmit={handleCreateEvent}>
          {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg('')} />}

          <div className="form-group">
            <label className="form-label" htmlFor="event-name-input">
              Event Name <span style={{ color: 'var(--rose-600)' }}>*</span>
            </label>
            <input
              id="event-name-input"
              type="text"
              className="form-input"
              placeholder="e.g. Goa Trip, Flat 402 Rent, Team Lunch"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              disabled={creating}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-date-input">
              Event Date <span style={{ color: 'var(--rose-600)' }}>*</span>
            </label>
            <input
              id="event-date-input"
              type="date"
              className="form-input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={creating}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateEventOpen(false)}
              disabled={creating}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AppLayout;
