import axios from 'axios';

// In production (Vercel) VITE_API_URL must be set to the Render backend URL.
// In development the Vite proxy forwards /api → localhost:5000.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler — clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
