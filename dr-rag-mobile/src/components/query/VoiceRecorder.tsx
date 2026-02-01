/**
 * Voice recorder component with animations.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
  maxDuration?: number;
  disabled?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  maxDuration = 30,
  disabled = false,
}: VoiceRecorderProps) {
  const {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder({ maxDuration });

  // Pulse animation
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withTiming(1);
      opacity.value = withTiming(0.3);
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = async () => {
    if (disabled) return;

    if (isRecording) {
      const uri = await stopRecording();
      if (uri) {
        onRecordingComplete(uri);
      }
    } else {
      await startRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <View style={styles.buttonContainer}>
        {isRecording && (
          <Animated.View style={[styles.pulse, pulseStyle]} />
        )}

        <TouchableOpacity
          style={[
            styles.button,
            isRecording && styles.buttonRecording,
            disabled && styles.buttonDisabled,
          ]}
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={isRecording ? 'stop' : 'microphone'}
            size={40}
            color={colors.textOnPrimary}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.duration}>
        {formatDuration(duration)} / {formatDuration(maxDuration)}
      </Text>

      <Text style={styles.hint}>
        {isRecording
          ? 'Tap to stop recording'
          : 'Tap to start recording your question'}
      </Text>

      {isRecording && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelRecording}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  pulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary[500],
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonRecording: {
    backgroundColor: colors.error,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[400],
  },
  duration: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hint: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VoiceRecorder;
