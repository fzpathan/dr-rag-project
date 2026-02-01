/**
 * Axios API instance with interceptors.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, endpoints, timeouts } from '../constants/api';

// Storage keys
const ACCESS_TOKEN_KEY = '@dr_rag_access_token';
const REFRESH_TOKEN_KEY = '@dr_rag_refresh_token';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: timeouts.default,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage helpers
export const getStoredTokens = async () => {
  try {
    const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    return { accessToken, refreshToken };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
};

export const setStoredTokens = async (accessToken: string, refreshToken: string) => {
  try {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Failed to store tokens:', error);
  }
};

export const clearStoredTokens = async () => {
  try {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
};

// Request interceptor - add auth header
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken } = await getStoredTokens();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject: (err: Error) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = await getStoredTokens();

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}${endpoints.refresh}`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        await setStoredTokens(access_token, refresh_token);

        processQueue(null, access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        await clearStoredTokens();
        // The auth store will handle navigation to login
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
