import api from './api';

export const eventService = {
  getAllEvents: async () => {
    const res = await api.get('/events');
    return res.data;
  },

  getEventById: async (eventId) => {
    const res = await api.get(`/events/${eventId}`);
    return res.data;
  },

  createEvent: async ({ name, eventDate }) => {
    const res = await api.post('/events', { name, eventDate });
    return res.data;
  },

  deleteEvent: async (eventId) => {
    const res = await api.delete(`/events/${eventId}`);
    return res.data;
  },
};

export default eventService;
