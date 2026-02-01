/**
 * Query state store using Zustand.
 */

import { create } from 'zustand';
import { queryService } from '../services/queryService';
import type {
  QueryRequest,
  QueryResponse,
  QueryHistoryItem,
  SourcesResponse,
} from '../types/query';

interface QueryStore {
  // State
  currentQuery: string;
  currentResponse: QueryResponse | null;
  isLoading: boolean;
  error: string | null;
  history: QueryHistoryItem[];
  sources: string[];
  inputMode: 'text' | 'voice';

  // Actions
  setQuery: (query: string) => void;
  setInputMode: (mode: 'text' | 'voice') => void;
  submitQuery: (request: QueryRequest) => Promise<QueryResponse>;
  transcribeAudio: (audioUri: string) => Promise<string>;
  loadSources: () => Promise<void>;
  clearResponse: () => void;
  clearError: () => void;
  addToHistory: (response: QueryResponse) => void;
}

const MAX_HISTORY_ITEMS = 20;

export const useQueryStore = create<QueryStore>((set, get) => ({
  // Initial state
  currentQuery: '',
  currentResponse: null,
  isLoading: false,
  error: null,
  history: [],
  sources: [],
  inputMode: 'text',

  // Actions
  setQuery: (query: string) => {
    set({ currentQuery: query });
  },

  setInputMode: (mode: 'text' | 'voice') => {
    set({ inputMode: mode });
  },

  submitQuery: async (request: QueryRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response = await queryService.query(request);

      set({
        currentResponse: response,
        isLoading: false,
      });

      // Add to history
      get().addToHistory(response);

      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        'Failed to get remedy recommendations';

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw new Error(errorMessage);
    }
  },

  transcribeAudio: async (audioUri: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await queryService.transcribe(audioUri);

      set({
        currentQuery: result.transcription,
        isLoading: false,
      });

      return result.transcription;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        'Failed to transcribe audio';

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw new Error(errorMessage);
    }
  },

  loadSources: async () => {
    try {
      const result: SourcesResponse = await queryService.getSources();
      set({ sources: result.sources });
    } catch (error) {
      console.error('Failed to load sources:', error);
    }
  },

  clearResponse: () => {
    set({ currentResponse: null, currentQuery: '' });
  },

  clearError: () => {
    set({ error: null });
  },

  addToHistory: (response: QueryResponse) => {
    const historyItem: QueryHistoryItem = {
      id: response.id,
      question: response.question,
      answer: response.answer,
      timestamp: new Date(response.created_at),
      cached: response.cached,
    };

    set((state) => ({
      history: [historyItem, ...state.history].slice(0, MAX_HISTORY_ITEMS),
    }));
  },
}));

export default useQueryStore;
