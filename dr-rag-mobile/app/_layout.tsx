/**
 * Root layout - handles auth state and navigation.
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { paperTheme } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, checkAuth } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function init() {
      // Check authentication status
      await checkAuth();

      // Hide splash screen
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    }

    init();
  }, [fontsLoaded, checkAuth]);

  if (!fontsLoaded || isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </PaperProvider>
  );
}
