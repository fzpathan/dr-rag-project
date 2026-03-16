/**
 * Query state store using Zustand.
 * Uses XHR onprogress for SSE streaming — fully supported in RN Hermes release builds.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ACCESS_TOKEN_KEY, endpoints } from '../constants/api';
import type { QueryRequest, QueryResponse, QueryHistoryItem } from '../types/query';

const HISTORY_STORAGE_KEY = '@cliniq_history';
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
  deleteHistoryItem: (id: string) => Promise<void>;
}

/** Parse SSE lines from a raw text chunk, returning updated state. */
function parseSSEChunk(
  chunk: string,
  fullText: string,
  citations: any[],
  doneData: any,
  onToken: (text: string) => void,
): { fullText: string; citations: any[]; doneData: any } {
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    try {
      const data = JSON.parse(line.slice(6));
      if (data.type === 'citations') {
        citations = data.citations || [];
      } else if (data.type === 'token') {
        fullText += data.content || '';
        onToken(fullText);
      } else if (data.type === 'done') {
        doneData = data;
      }
    } catch {}
  }
  return { fullText, citations, doneData };
}

/** Stream SSE via XMLHttpRequest.onprogress — works in RN Hermes release builds. */
function streamViaXHR(
  url: string,
  body: string,
  token: string,
  onToken: (text: string) => void,
  onFirstChunk: () => void,
): Promise<{ fullText: string; citations: any[]; doneData: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    let fullText = '';
    let citations: any[] = [];
    let doneData: any = null;
    let lastIndex = 0;
    let firstChunkFired = false;

    xhr.onprogress = () => {
      if (!firstChunkFired) {
        firstChunkFired = true;
        onFirstChunk();
      }
      const chunk = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      const parsed = parseSSEChunk(chunk, fullText, citations, doneData, onToken);
      fullText = parsed.fullText;
      citations = parsed.citations;
      doneData = parsed.doneData;
    };

    xhr.onload = () => {
      if (xhr.status >= 400) {
        try {
          const j = JSON.parse(xhr.responseText);
          reject(new Error(j.detail || `Request failed (${xhr.status})`));
        } catch {
          reject(new Error(`Request failed (${xhr.status})`));
        }
        return;
      }
      // Parse any remaining buffered text
      const remaining = xhr.responseText.slice(lastIndex);
      if (remaining) {
        const parsed = parseSSEChunk(remaining, fullText, citations, doneData, onToken);
        fullText = parsed.fullText;
        citations = parsed.citations;
        doneData = parsed.doneData;
      }
      resolve({ fullText, citations, doneData });
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(body);
  });
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
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      const res = await fetch(`${API_BASE_URL}${endpoints.history}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const items = await res.json();
        const mapped: QueryHistoryItem[] = items.map((i: any) => ({
          id: i.id,
          question: i.question,
          answer: i.answer,
          timestamp: new Date(i.created_at),
          cached: i.cached,
        }));
        set({ history: mapped });
        await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(mapped));
        return;
      }
    } catch {}
    // Fallback to AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) set({ history: JSON.parse(raw) });
    } catch {}
  },

  deleteHistoryItem: async (id: string) => {
    try {
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      await fetch(`${API_BASE_URL}${endpoints.history}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {}
    const updated = get().history.filter((item) => item.id !== id);
    set({ history: updated });
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  },

  submitQuery: async (request: QueryRequest) => {
    set({ isStreaming: true, isLoading: true, error: null, streamingText: '', currentResponse: null });

    try {
      const accessToken = (await AsyncStorage.getItem(ACCESS_TOKEN_KEY)) || '';

      const { fullText, citations, doneData } = await streamViaXHR(
        `${API_BASE_URL}${endpoints.queryStream}`,
        JSON.stringify(request),
        accessToken,
        (text) => set({ streamingText: text, isLoading: false }),
        () => set({ isLoading: false }),
      );

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

        // Save to server-side history
        const historyItem: QueryHistoryItem = {
          id: response.id,
          question: response.question,
          answer: response.answer,
          timestamp: new Date(),
          cached: response.cached,
        };
        try {
          const saved = await fetch(`${API_BASE_URL}${endpoints.history}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({
              id: response.id,
              question: response.question,
              answer: response.answer,
              citations: citations,
              sources_used: response.sources_used,
              cached: response.cached,
              processing_time_ms: String(response.processing_time_ms),
            }),
          });
          if (saved.ok) {
            const serverItem = await saved.json();
            historyItem.id = serverItem.id;
          }
        } catch {}

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
