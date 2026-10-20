import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EventProvider } from './context/EventContext';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Participants from './pages/Participants';
import Expenses from './pages/Expenses';
import Balances from './pages/Balances';
import Settlements from './pages/Settlements';

function App() {
  return (
    <BrowserRouter>
      <EventProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="events" element={<Events />} />
            <Route path="participants" element={<Participants />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="balances" element={<Balances />} />
            <Route path="settlements" element={<Settlements />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </EventProvider>
    </BrowserRouter>
  );
}

export default App;
