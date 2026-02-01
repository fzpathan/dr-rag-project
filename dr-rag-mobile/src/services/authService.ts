/**
 * Authentication service.
 */

import api, { setStoredTokens, clearStoredTokens } from './api';
import { endpoints } from '../constants/api';
import type {
  LoginCredentials,
  RegisterData,
  TokenResponse,
  User
} from '../types/auth';

export const authService = {
  /**
   * Register a new user.
   */
  async register(data: RegisterData): Promise<User> {
    const response = await api.post<User>(endpoints.register, data);
    return response.data;
  },

  /**
   * Login with email and password.
   */
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>(endpoints.login, credentials);

    // Store tokens
    await setStoredTokens(
      response.data.access_token,
      response.data.refresh_token
    );

    return response.data;
  },

  /**
   * Get current user info.
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>(endpoints.me);
    return response.data;
  },

  /**
   * Logout (clear tokens).
   */
  async logout(): Promise<void> {
    try {
      await api.post(endpoints.logout);
    } catch {
      // Ignore errors on logout
    } finally {
      await clearStoredTokens();
    }
  },

  /**
   * Refresh access token.
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>(endpoints.refresh, {
      refresh_token: refreshToken,
    });

    await setStoredTokens(
      response.data.access_token,
      response.data.refresh_token
    );

    return response.data;
  },
};

export default authService;
