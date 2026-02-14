// Environment utilities
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');