/**
 * Loading spinner component.
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../constants/colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  color = colors.primary[500],
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  message: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
});

export default LoadingSpinner;
