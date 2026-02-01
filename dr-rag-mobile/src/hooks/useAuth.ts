/**
 * Authentication hook.
 */

import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { LoginCredentials, RegisterData } from '../types/auth';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    loadUser,
    checkAuth,
  } = useAuthStore();

  const login = useCallback(async (credentials: LoginCredentials) => {
    await storeLogin(credentials);
  }, [storeLogin]);

  const register = useCallback(async (data: RegisterData) => {
    await storeRegister(data);
  }, [storeRegister]);

  const logout = useCallback(async () => {
    await storeLogout();
  }, [storeLogout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    loadUser,
    checkAuth,
  };
}

export default useAuth;
