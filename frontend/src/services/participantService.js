import api from './api';

export const participantService = {
  getParticipants: async (eventId) => {
    const res = await api.get(`/events/${eventId}/participants`);
    return res.data;
  },

  addParticipant: async (eventId, { name }) => {
    const res = await api.post(`/events/${eventId}/participants`, { name });
    return res.data;
  },

  removeParticipant: async (eventId, participantId) => {
    const res = await api.delete(`/events/${eventId}/participants/${participantId}`);
    return res.data;
  },
};

export default participantService;
