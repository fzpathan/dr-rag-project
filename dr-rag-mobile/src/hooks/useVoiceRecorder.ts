/**
 * Voice recorder hook using expo-av for recording + Whisper backend for transcription.
 * Supports Hindi, Marathi, English, and auto-detect.
 */

import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ACCESS_TOKEN_KEY, endpoints } from '../constants/api';

export type VoiceLanguage = 'auto' | 'hi' | 'mr' | 'en';

interface UseVoiceRecorderOptions {
  maxDuration?: number; // seconds
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  duration: number;
  error: string | null;
  startRecording: (language?: VoiceLanguage) => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const { maxDuration = 60 } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const langRef = useRef<VoiceLanguage>('auto');
  const stopCalledRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = useCallback(async (language: VoiceLanguage = 'auto') => {
    try {
      setError(null);
      setDuration(0);
      stopCalledRef.current = false;
      langRef.current = language;

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission denied. Please allow access in device settings.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= maxDuration - 1) {
            // Auto-stop when limit reached
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e.message || 'Failed to start recording');
    }
  }, [maxDuration]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (stopCalledRef.current || !recordingRef.current) return null;
    stopCalledRef.current = true;

    clearTimer();
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const recording = recordingRef.current;
      recordingRef.current = null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setDuration(0);

      if (!uri) throw new Error('No audio recorded');

      // Upload to Whisper backend
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('language', langRef.current);

      const res = await fetch(`${API_BASE_URL}${endpoints.voiceTranscribe}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `Transcription failed (${res.status})`);
      }

      const data = await res.json();
      return data.text?.trim() || null;
    } catch (e: any) {
      setError(e.message || 'Transcription failed');
      return null;
    } finally {
      setIsTranscribing(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    clearTimer();
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setDuration(0);
    setError(null);
    stopCalledRef.current = false;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  }, []);

  return {
    isRecording,
    isTranscribing,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

export default useVoiceRecorder;
