/**
 * Voice recorder hook using expo-av.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

interface UseVoiceRecorderOptions {
  maxDuration?: number; // in seconds
  onTranscriptionComplete?: (text: string) => void;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordingUri: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const { maxDuration = 30 } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Microphone permission denied');
        }
      } catch (err) {
        setError('Failed to request microphone permission');
      }
    })();

    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            // Auto-stop at max duration
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused, maxDuration]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordingUri(null);
      setDuration(0);

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        return null;
      }

      setIsRecording(false);
      setIsPaused(false);

      await recordingRef.current.stopAndUnloadAsync();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        setRecordingUri(uri);

        // Haptic feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        return uri;
      }

      return null;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setError('Failed to stop recording');
      return null;
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    try {
      if (recordingRef.current && isRecording) {
        await recordingRef.current.pauseAsync();
        setIsPaused(true);
      }
    } catch (err) {
      console.error('Failed to pause recording:', err);
    }
  }, [isRecording]);

  const resumeRecording = useCallback(async () => {
    try {
      if (recordingRef.current && isPaused) {
        await recordingRef.current.startAsync();
        setIsPaused(false);
      }
    } catch (err) {
      console.error('Failed to resume recording:', err);
    }
  }, [isPaused]);

  const cancelRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setRecordingUri(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (err) {
      console.error('Failed to cancel recording:', err);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    recordingUri,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}

export default useVoiceRecorder;
