/**
 * Voice recorder — premium dark design with glowing mic.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  { value: 'auto',  label: 'Auto' },
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

  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      scale1.value = withRepeat(withSequence(withTiming(1.6, { duration: 900 }), withTiming(1, { duration: 900 })), -1);
      scale2.value = withRepeat(withSequence(withTiming(2.1, { duration: 1300 }), withTiming(1, { duration: 1300 })), -1);
      opacity1.value = withRepeat(withSequence(withTiming(0.4, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
      opacity2.value = withRepeat(withSequence(withTiming(0.2, { duration: 1300 }), withTiming(0, { duration: 1300 })), -1);
    } else {
      cancelAnimation(scale1); cancelAnimation(scale2);
      cancelAnimation(opacity1); cancelAnimation(opacity2);
      scale1.value = withTiming(1); scale2.value = withTiming(1);
      opacity1.value = withTiming(0); opacity2.value = withTiming(0);
    }
  }, [isRecording]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
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
      {/* Language pills */}
      <View style={styles.langRow}>
        {LANGUAGES.map((l) => (
          <TouchableOpacity
            key={l.value}
            style={[styles.langPill, selectedLang === l.value && styles.langPillActive]}
            onPress={() => setSelectedLang(l.value)}
            disabled={isRecording || isTranscribing}
            activeOpacity={0.7}
          >
            <Text style={[styles.langText, selectedLang === l.value && styles.langTextActive]}>
              {l.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Mic button with ripple rings */}
      <View style={styles.micWrap}>
        <Animated.View style={[styles.ring, ring2Style]} />
        <Animated.View style={[styles.ring, ring1Style]} />

        <TouchableOpacity
          onPress={handlePress}
          disabled={disabled || isTranscribing}
          activeOpacity={0.85}
        >
          {isRecording ? (
            <LinearGradient
              colors={[colors.error, '#c93535']}
              style={styles.micBtn}
            >
              <MaterialCommunityIcons name="stop" size={36} color="#fff" />
            </LinearGradient>
          ) : isTranscribing ? (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.micBtn}
            >
              <MaterialCommunityIcons name="loading" size={36} color="#fff" />
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.micBtn, (disabled) && styles.micBtnDisabled]}
            >
              <MaterialCommunityIcons name="microphone" size={36} color="#fff" />
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      {/* Duration */}
      {isRecording && (
        <Text style={styles.duration}>{formatDuration(duration)} / {formatDuration(maxDuration)}</Text>
      )}

      {/* Status */}
      <Text style={styles.hint}>
        {isTranscribing
          ? 'Transcribing — please wait'
          : isRecording
          ? 'Tap to stop recording'
          : 'Tap to start recording'}
      </Text>

      {/* Cancel */}
      {isRecording && (
        <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecording} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    width: '100%',
  },

  // Language pills
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  langPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  langPillActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  langText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  langTextActive: { color: colors.primary[400] },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.errorLight,
    borderRadius: 8,
  },
  errorText: { color: colors.error, fontSize: 13 },

  // Mic
  micWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary[500],
  },
  micBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.glowTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  micBtnDisabled: { opacity: 0.4 },

  // Info
  duration: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, letterSpacing: -1, marginBottom: 8 },
  hint: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },

  cancelBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: colors.errorLight,
  },
  cancelText: { color: colors.error, fontSize: 14, fontWeight: '700' },
});

export default VoiceRecorder;
