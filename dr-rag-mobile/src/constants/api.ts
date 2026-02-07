/**
 * API configuration constants.
 */

// API Base URL - Change this for production
export const API_BASE_URL = __DEV__
  ? 'http://192.168.29.5:8000/api/v1'  // Local network IP for physical device
  : 'https://your-production-api.com/api/v1';

// For Android emulator, use: 'http://10.0.2.2:8000/api/v1'
// For iOS simulator, use: 'http://localhost:8000/api/v1'

// API Endpoints
export const endpoints = {
  // Auth
  register: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
  me: '/auth/me',
  logout: '/auth/logout',

  // Query
  query: '/query',
  sources: '/query/sources',
  stats: '/query/stats',
  cacheStats: '/query/cache-stats',

  // Health
  health: '/health',
};

// Request timeouts (ms)
export const timeouts = {
  default: 30000,
  query: 60000,  // RAG queries can take longer
};

export default {
  API_BASE_URL,
  endpoints,
  timeouts,
};
