/**
 * API configuration constants.
 */

// Production server — update this if the server IP/domain changes
const PRODUCTION_URL = 'http://13.233.129.108/api/v1';

// Development uses HTTP to avoid self-signed SSL cert rejection on Android emulator
const DEVELOPMENT_URL = 'http://13.233.129.108/api/v1';

export const API_BASE_URL = __DEV__ ? DEVELOPMENT_URL : PRODUCTION_URL;

// Token storage keys (must match api.ts)
export const ACCESS_TOKEN_KEY = '@cliniq_access_token';
export const REFRESH_TOKEN_KEY = '@cliniq_refresh_token';

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
  queryStream: '/query/stream',
  sources: '/query/sources',
  stats: '/query/stats',
  cacheStats: '/query/cache-stats',

  // Voice transcription (Whisper backend)
  voiceTranscribe: '/voice/transcribe',

  // Admin / settings
  mySettings: '/admin/my-settings',

  // Persistent data
  history: '/history',
  saved: '/saved',
  patients: '/patients',

  // Health
  health: '/health',
};

// Request timeouts (ms)
export const timeouts = {
  default: 30000,
  query: 120000,   // streaming queries can take longer
  voice: 60000,    // whisper transcription
};

export default { API_BASE_URL, endpoints, timeouts };
