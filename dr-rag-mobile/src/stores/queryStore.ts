/**
 * Query state store using Zustand.
 * Uses SSE streaming endpoint for real-time token output.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ACCESS_TOKEN_KEY, endpoints } from '../constants/api';
import type { QueryRequest, QueryResponse, QueryHistoryItem } from '../types/query';

const HISTORY_STORAGE_KEY = '@dr_rag_history';
const MAX_HISTORY_ITEMS = 50;

interface QueryStore {
  currentQuery: string;
  currentResponse: QueryResponse | null;
  streamingText: string;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  history: QueryHistoryItem[];
  inputMode: 'text' | 'voice';

  setQuery: (query: string) => void;
  setInputMode: (mode: 'text' | 'voice') => void;
  submitQuery: (request: QueryRequest) => Promise<void>;
  clearResponse: () => void;
  clearError: () => void;
  loadHistory: () => Promise<void>;
}

export const useQueryStore = create<QueryStore>((set, get) => ({
  currentQuery: '',
  currentResponse: null,
  streamingText: '',
  isStreaming: false,
  isLoading: false,
  error: null,
  history: [],
  inputMode: 'text',

  setQuery: (query) => set({ currentQuery: query }),
  setInputMode: (mode) => set({ inputMode: mode }),
  clearResponse: () => set({ currentResponse: null, streamingText: '', currentQuery: '' }),
  clearError: () => set({ error: null }),

  loadHistory: async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const items: QueryHistoryItem[] = JSON.parse(raw);
        set({ history: items });
      }
    } catch {}
  },

  submitQuery: async (request: QueryRequest) => {
    set({ isStreaming: true, isLoading: true, error: null, streamingText: '', currentResponse: null });

    try {
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      const res = await fetch(`${API_BASE_URL}${endpoints.queryStream}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `Request failed (${res.status})`);
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming not supported');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let citations: any[] = [];
      let doneData: any = null;

      set({ isLoading: false });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'citations') {
              citations = data.citations || [];
            } else if (data.type === 'token') {
              fullText += data.content || '';
              set({ streamingText: fullText });
            } else if (data.type === 'done') {
              doneData = data;
            }
          } catch {}
        }
      }

      // Build full response object
      if (doneData || fullText) {
        const response: QueryResponse = {
          id: doneData?.id || String(Date.now()),
          question: request.question,
          answer: fullText,
          citations,
          sources_used: doneData?.sources_used || [],
          processing_time_ms: doneData?.processing_time_ms || 0,
          cached: doneData?.cached || false,
          created_at: new Date().toISOString(),
        };

        set({ currentResponse: response, streamingText: '' });

        // Persist to history
        const historyItem: QueryHistoryItem = {
          id: response.id,
          question: response.question,
          answer: response.answer,
          timestamp: new Date(),
          cached: response.cached,
        };

        const current = get().history;
        const updated = [historyItem, ...current].slice(0, MAX_HISTORY_ITEMS);
        set({ history: updated });
        await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to get remedy recommendations', isLoading: false });
    } finally {
      set({ isStreaming: false, isLoading: false });
    }
  },
}));

export default useQueryStore;
