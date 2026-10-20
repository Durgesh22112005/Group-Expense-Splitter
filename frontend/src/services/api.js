import axios from 'axios';

/**
 * Centralized Axios instance for SplitWise Pro.
 * Uses relative '/api' which Vite proxies to http://localhost:8080/api.
 * Falls back to http://localhost:8080/api if running outside Vite proxy.
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Response interceptor to format clean error messages from backend
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred. Please try again.';

    if (error.response) {
      const data = error.response.data;

      if (data) {
        if (typeof data === 'string') {
          message = data;
        } else if (data.message) {
          message = data.message;
        } else if (data.error) {
          message = data.error;
        }

        // If field-level validation errors exist, append the first few
        if (data.errors && typeof data.errors === 'object') {
          const fieldMsgs = Object.values(data.errors);
          if (fieldMsgs.length > 0) {
            message = `${message}: ${fieldMsgs.join(', ')}`;
          }
        }
      }
    } else if (error.request) {
      message = 'Unable to reach backend server. Please make sure the Spring Boot service is running on port 8080.';
    } else {
      message = error.message || message;
    }

    const enhancedError = new Error(message);
    enhancedError.status = error.response ? error.response.status : null;
    enhancedError.originalError = error;

    return Promise.reject(enhancedError);
  }
);

export default api;
