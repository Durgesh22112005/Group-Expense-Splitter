import api from './api';

export const balanceService = {
  getBalances: async (eventId) => {
    const res = await api.get(`/events/${eventId}/balances`);
    return res.data;
  },
};

export default balanceService;
