/**
 * Entry point - redirects based on auth state.
 */

import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
