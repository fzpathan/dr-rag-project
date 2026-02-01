/**
 * Authentication state store using Zustand.
 */

import { create } from 'zustand';
import { authService } from '../services/authService';
import { getStoredTokens, clearStoredTokens } from '../services/api';
import type { User, LoginCredentials, RegisterData, AuthState } from '../types/auth';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  // Actions
  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true });

    try {
      const tokens = await authService.login(credentials);
      const user = await authService.getCurrentUser();

      set({
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });

    try {
      await authService.register(data);
      // After registration, login the user
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
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  loadUser: async () => {
    set({ isLoading: true });

    try {
      const user = await authService.getCurrentUser();
      const tokens = await getStoredTokens();

      set({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      await clearStoredTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
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

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

export default useAuthStore;
