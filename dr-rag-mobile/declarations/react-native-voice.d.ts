declare module 'react-native-voice' {
  export type SpeechResultsEvent = {
    value?: string[];
  };

  export type SpeechErrorEvent = {
    error?: {
      message?: string;
      [key: string]: any;
    };
  };

  export interface Voice {
    onSpeechStart?: () => void;
    onSpeechResults?: (event: SpeechResultsEvent) => void;
    onSpeechPartialResults?: (event: SpeechResultsEvent) => void;
    onSpeechError?: (event: SpeechErrorEvent) => void;
    onSpeechEnd?: () => void;
    start(locale: string, options?: Record<string, any>): Promise<void>;
    stop(): Promise<void>;
    cancel(): Promise<void>;
    destroy(): Promise<void>;
    removeAllListeners(): void;
  }

  const voice: Voice;
  export default voice;
}
