import api from './api';

export const expenseService = {
  getExpenses: async (eventId) => {
    const res = await api.get(`/events/${eventId}/expenses`);
    return res.data;
  },

  createExpense: async (eventId, expenseData) => {
    const res = await api.post(`/events/${eventId}/expenses`, expenseData);
    return res.data;
  },

  updateExpense: async (eventId, expenseId, expenseData) => {
    const res = await api.put(`/events/${eventId}/expenses/${expenseId}`, expenseData);
    return res.data;
  },

  deleteExpense: async (eventId, expenseId) => {
    const res = await api.delete(`/events/${eventId}/expenses/${expenseId}`);
    return res.data;
  },
};

export default expenseService;
