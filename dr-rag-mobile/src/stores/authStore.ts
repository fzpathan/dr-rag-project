/**
 * Authentication state store using Zustand.
 * Also fetches and stores admin ACL settings after login.
 */

import { create } from 'zustand';
import { authService } from '../services/authService';
import { getStoredTokens, clearStoredTokens } from '../services/api';
import type { User, LoginCredentials, RegisterData, AuthState } from '../types/auth';
import api from '../services/api';
import { endpoints } from '../constants/api';

export interface AppSettings {
  show_voice: boolean;
  show_analysis: boolean;
  show_citations: boolean;
  show_history: boolean;
  show_saved_rubrics: boolean;
  show_advanced_options: boolean;
  show_processing_time: boolean;
  theme: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  show_voice: true,
  show_analysis: true,
  show_citations: true,
  show_history: true,
  show_saved_rubrics: true,
  show_advanced_options: true,
  show_processing_time: true,
  theme: 'default',
};

interface AuthStore extends AuthState {
  settings: AppSettings;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogleToken: (idToken: string, fullName?: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

async function fetchSettings(): Promise<AppSettings> {
  try {
    const res = await api.get<AppSettings>(endpoints.mySettings);
    return { ...DEFAULT_SETTINGS, ...res.data };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  settings: DEFAULT_SETTINGS,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true });
    try {
      const tokens = await authService.login(credentials);
      const user = await authService.getCurrentUser();
      const settings = await fetchSettings();
      set({ user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, isAuthenticated: true, isLoading: false, settings });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithGoogleToken: async (idToken: string, fullName?: string) => {
    set({ isLoading: true });
    try {
      const tokens = await authService.loginWithGoogleToken(idToken, fullName);
      const user = await authService.getCurrentUser();
      const settings = await fetchSettings();
      set({ user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, isAuthenticated: true, isLoading: false, settings });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      await authService.register(data);
      await get().login({ email: data.email, password: data.password });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false, settings: DEFAULT_SETTINGS });
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getCurrentUser();
      const tokens = await getStoredTokens();
      const settings = await fetchSettings();
      set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, isAuthenticated: true, isLoading: false, settings });
    } catch (error) {
      await clearStoredTokens();
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false, settings: DEFAULT_SETTINGS });
    }
  },

  checkAuth: async () => {
    const tokens = await getStoredTokens();
    if (!tokens.accessToken) {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }
    try {
      await get().loadUser();
      return true;
    } catch {
      return false;
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));

export default useAuthStore;
