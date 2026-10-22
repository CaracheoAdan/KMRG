import axios from 'axios';

/**
 * Cliente HTTP del panel. La sesión vive en la cookie httpOnly `kmrg_session`
 * (enviada automáticamente gracias a `withCredentials`). El header
 * `X-Requested-With` es obligatorio para las peticiones mutables (protección CSRF).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'kmrg-admin',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url ?? '');
    // 401 en login = credenciales incorrectas; 401 en /auth/me = no hay sesión (lo gestiona AuthContext).
    const isExempt = url.includes('/auth/login') || url.includes('/auth/me');
    if (error.response?.status === 401 && !isExempt) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
