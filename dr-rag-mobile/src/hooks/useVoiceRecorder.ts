/**
 * Voice recorder hook that uses native speech recognition (react-native-voice)
 * to convert microphone input into text directly on the device.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Voice from 'react-native-voice';

interface UseVoiceRecorderOptions {
  maxDuration?: number; // seconds
  language?: string;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  duration: number;
  transcription: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => Promise<void>;
}

type SpeechResultsEvent = {
  value?: string[];
};

type SpeechErrorEvent = {
  error?: {
    message?: string;
  };
};

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const { maxDuration = 30, language = 'en-US' } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingResolveRef = useRef<((text: string | null) => void) | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const isRecordingRef = useRef(false);

  const finalizeRecognition = useCallback((text: string | null) => {
    if (pendingResolveRef.current) {
      pendingResolveRef.current(text);
      pendingResolveRef.current = null;
    }
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const getTranscript = useCallback(() => {
    return lastTranscriptRef.current.trim() || null;
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!isRecordingRef.current) {
      return getTranscript();
    }

    return new Promise(async (resolve) => {
      pendingResolveRef.current = resolve;

      try {
        if (!Voice) {
          setError('Speech recognition module unavailable.');
          finalizeRecognition(getTranscript());
          pendingResolveRef.current = null;
          setIsRecording(false);
          return;
        }

        await Voice.stop();
      } catch (err) {
        console.error('Speech recognition stop failed:', err);
        setError('Failed to stop speech recognition');
        finalizeRecognition(getTranscript());
        pendingResolveRef.current = null;
      } finally {
        setIsRecording(false);
        setDuration(0);
      }
    });
  }, [finalizeRecognition, getTranscript]);

  const cancelRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      return;
    }

    try {
      if (!Voice) {
        pendingResolveRef.current = null;
        setIsRecording(false);
        setDuration(0);
        setTranscription('');
        lastTranscriptRef.current = '';
        return;
      }

      await Voice.cancel();
    } catch (err) {
      console.error('Speech recognition cancel failed:', err);
    } finally {
      finalizeRecognition(null);
      pendingResolveRef.current = null;
      setIsRecording(false);
      setDuration(0);
      setTranscription('');
      lastTranscriptRef.current = '';
    }
  }, [finalizeRecognition]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      return;
    }

    if (!Voice) {
      setError('Speech recognition module unavailable.');
      return;
    }

    setError(null);
    setTranscription('');
    lastTranscriptRef.current = '';
    setDuration(0);

    pendingResolveRef.current = null;

    try {
      await Voice.start(language);
      setIsRecording(true);
    } catch (err) {
      console.error('Speech recognition failed to start:', err);
      setError('Unable to access speech recognition');
    }
  }, [language]);

  useEffect(() => {
    if (!Voice) {
      setError('Speech recognition module unavailable.');
      return;
    }

    const handleSpeechStart = () => {
      setError(null);
    };

    const handleSpeechResults = (event: SpeechResultsEvent) => {
      const value = event.value?.join(' ') || '';
      lastTranscriptRef.current = value.trim();
      setTranscription(value.trim());
    };

    const handleSpeechPartialResults = (event: SpeechResultsEvent) => {
      const value = event.value?.join(' ') || '';
      setTranscription(value.trim());
    };

    const handleSpeechError = (event: SpeechErrorEvent) => {
      const message = event.error?.message || 'Speech recognition failed';
      setError(message);
      finalizeRecognition(null);
      pendingResolveRef.current = null;
      setIsRecording(false);
    };

    const handleSpeechEnd = () => {
      finalizeRecognition(getTranscript());
    };

    Voice.onSpeechStart = handleSpeechStart;
    Voice.onSpeechResults = handleSpeechResults;
    Voice.onSpeechPartialResults = handleSpeechPartialResults;
    Voice.onSpeechError = handleSpeechError;
    Voice.onSpeechEnd = handleSpeechEnd;

    return () => {
      Voice.destroy().catch(() => {});
      Voice.removeAllListeners();
    };
  }, [finalizeRecognition, getTranscript]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (duration >= maxDuration && isRecording) {
      stopRecording();
    }
  }, [duration, isRecording, maxDuration, stopRecording]);

  return {
    isRecording,
    duration,
    transcription,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

export default useVoiceRecorder;
