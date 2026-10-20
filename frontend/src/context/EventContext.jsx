import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import eventService from '../services/eventService';

const EventContext = createContext(null);

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(() => {
    const saved = localStorage.getItem('splitter_current_event_id');
    return saved ? Number(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventService.getAllEvents();
      setEvents(data);

      // If no current event selected or current event no longer exists, select first available
      if (data && data.length > 0) {
        const exists = data.some((e) => e.id === currentEventId);
        if (!currentEventId || !exists) {
          setCurrentEventId(data[0].id);
          localStorage.setItem('splitter_current_event_id', String(data[0].id));
        }
      } else {
        setCurrentEventId(null);
        localStorage.removeItem('splitter_current_event_id');
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      setError(err.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    refreshEvents();
  }, []);

  const selectEvent = useCallback((id) => {
    const numId = id ? Number(id) : null;
    setCurrentEventId(numId);
    if (numId) {
      localStorage.setItem('splitter_current_event_id', String(numId));
    } else {
      localStorage.removeItem('splitter_current_event_id');
    }
  }, []);

  const currentEvent = events.find((e) => e.id === currentEventId) || null;

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <EventContext.Provider
      value={{
        events,
        currentEventId,
        currentEvent,
        loading,
        error,
        refreshEvents,
        selectEvent,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};

export default EventContext;
