import api from './api';

export const settlementService = {
  getSettlements: async (eventId) => {
    const res = await api.get(`/events/${eventId}/settlements`);
    return res.data;
  },

  completeSettlement: async (settlementId) => {
    const res = await api.patch(`/settlements/${settlementId}/complete`);
    return res.data;
  },
};

export default settlementService;
