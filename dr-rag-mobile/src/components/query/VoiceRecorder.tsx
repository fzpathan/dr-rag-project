/**
 * Voice recorder component.
 * Records audio via expo-av, uploads to the Whisper backend for transcription.
 * Supports Auto-detect / Hindi / Marathi / English.
 */

import React, { useEffect, useState } from 'react';
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
import { useVoiceRecorder, type VoiceLanguage } from '../../hooks/useVoiceRecorder';

interface VoiceRecorderProps {
  onRecordingComplete: (transcription: string) => void;
  maxDuration?: number;
  disabled?: boolean;
}

const LANGUAGES: { value: VoiceLanguage; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'hi',   label: 'Hindi' },
  { value: 'mr',   label: 'Marathi' },
  { value: 'en',   label: 'English' },
];

export function VoiceRecorder({
  onRecordingComplete,
  maxDuration = 60,
  disabled = false,
}: VoiceRecorderProps) {
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>('auto');

  const { isRecording, isTranscribing, duration, error, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder({ maxDuration });

  // Pulse animation
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(withSequence(withTiming(1.3, { duration: 600 }), withTiming(1, { duration: 600 })), -1, false);
      opacity.value = withRepeat(withSequence(withTiming(0.6, { duration: 600 }), withTiming(0.3, { duration: 600 })), -1, false);
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
    if (disabled || isTranscribing) return;
    if (isRecording) {
      const text = await stopRecording();
      if (text) onRecordingComplete(text);
    } else {
      await startRecording(selectedLang);
    }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {/* Language selector */}
      <View style={styles.langRow}>
        {LANGUAGES.map((l) => (
          <TouchableOpacity
            key={l.value}
            style={[styles.langBtn, selectedLang === l.value && styles.langBtnActive]}
            onPress={() => setSelectedLang(l.value)}
            disabled={isRecording || isTranscribing}
          >
            <Text style={[styles.langBtnText, selectedLang === l.value && styles.langBtnTextActive]}>
              {l.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Mic button */}
      <View style={styles.buttonContainer}>
        {isRecording && <Animated.View style={[styles.pulse, pulseStyle]} />}
        <TouchableOpacity
          style={[styles.button, isRecording && styles.buttonRecording, (disabled || isTranscribing) && styles.buttonDisabled]}
          onPress={handlePress}
          disabled={disabled || isTranscribing}
          activeOpacity={0.8}
        >
          {isTranscribing ? (
            <MaterialCommunityIcons name="loading" size={36} color={colors.textOnPrimary} />
          ) : (
            <MaterialCommunityIcons
              name={isRecording ? 'stop' : 'microphone'}
              size={40}
              color={colors.textOnPrimary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Duration */}
      {isRecording && (
        <Text style={styles.duration}>{formatDuration(duration)} / {formatDuration(maxDuration)}</Text>
      )}

      {/* Status hint */}
      <Text style={styles.hint}>
        {isTranscribing
          ? 'Transcribing… please wait'
          : isRecording
          ? 'Tap to stop recording'
          : 'Tap to start — speech is translated to English'}
      </Text>

      {/* Cancel */}
      {isRecording && (
        <TouchableOpacity style={styles.cancelButton} onPress={cancelRecording}>
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
    width: '100%',
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  langBtnActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  langBtnTextActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
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
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  hint: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
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
