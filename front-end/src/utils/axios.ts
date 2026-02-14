
import axios from 'axios';
import Cookies from 'js-cookie';
import { API_URL } from './environment';

const api = axios.create({
  baseURL: API_URL, // backend URL from env or default
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// attach token and username (from cookies) if present
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined' && config.headers) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const userRaw = Cookies.get('user');
      if (userRaw) {
        try {
          const user = JSON.parse(userRaw);
          if (user && user.username) {
            config.headers['x-username'] = user.username;
            console.log(`[axios] Added x-username header: ${user.username}`);
          }
        } catch (e) {
          console.error('[axios] Error parsing user cookie:', e);
        }
      }

      // Don't override Content-Type if it's FormData
      // (browser needs to set multipart boundary)
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
        console.log('[axios] FormData detected, removing Content-Type to allow browser to set multipart boundary');
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
export { API_URL };
