// Centralized API configuration using Vite environment variables
const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8085';
export const API_BASE_URL = rawUrl.replace(/\/+$/, '');
export const IS_LOCAL_FALLBACK = !import.meta.env.VITE_API_URL;

