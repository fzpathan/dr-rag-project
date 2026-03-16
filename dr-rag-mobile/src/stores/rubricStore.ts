/**
 * Saved rubrics store — syncs with server, falls back to AsyncStorage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ACCESS_TOKEN_KEY, endpoints } from '../constants/api';
import { parseRubricTable } from '../utils/parseRubricTable';
import type { SavedRubric, ParsedRubricTable } from '../types/rubric';

const STORAGE_KEY = '@cliniq_saved_rubrics';
const MAX_ITEMS = 100;

interface RubricStore {
  savedRubrics: SavedRubric[];
  isLoading: boolean;

  loadRubrics: () => Promise<void>;
  saveRubric: (
    question: string,
    queryResponseId: string,
    answer: string,
    citations: any[],
  ) => Promise<void>;
  deleteRubric: (id: string) => Promise<void>;
  isRubricSaved: (queryResponseId: string) => boolean;
  clearAllRubrics: () => void;
}

async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem(ACCESS_TOKEN_KEY)) || '';
}

export const useRubricStore = create<RubricStore>((set, get) => ({
  savedRubrics: [],
  isLoading: false,

  loadRubrics: async () => {
    set({ isLoading: true });
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}${endpoints.saved}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const items: any[] = await res.json();
        const rubrics: SavedRubric[] = items.slice(0, MAX_ITEMS).map((i) => ({
          id: i.id,
          name: i.name || i.question,
          question: i.question,
          answer: i.answer,
          citations: i.citations || [],
          queryResponseId: i.id,
          table: parseRubricTable(i.answer),
          savedAt: i.created_at,
        }));
        set({ savedRubrics: rubrics, isLoading: false });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rubrics));
        return;
      }
    } catch {}

    // Fallback: load from local cache
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ savedRubrics: JSON.parse(raw) });
    } catch {}
    set({ isLoading: false });
  },

  saveRubric: async (
    question: string,
    queryResponseId: string,
    answer: string,
    citations: any[],
  ) => {
    if (get().isRubricSaved(queryResponseId)) return;

    const table = parseRubricTable(answer);
    // Build optimistic local entry immediately so UI updates without waiting
    const localEntry: SavedRubric = {
      id: queryResponseId,
      name: question,
      question,
      answer,
      citations,
      queryResponseId,
      table,
      savedAt: new Date().toISOString(),
    };

    set((state) => ({
      savedRubrics: [localEntry, ...state.savedRubrics].slice(0, MAX_ITEMS),
    }));

    // Persist to server
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}${endpoints.saved}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: question,
          question,
          answer,
          citations,
        }),
      });
      if (res.ok) {
        const serverItem = await res.json();
        // Replace local entry with server's assigned id
        set((state) => ({
          savedRubrics: state.savedRubrics.map((r) =>
            r.id === queryResponseId
              ? { ...r, id: serverItem.id, savedAt: serverItem.created_at }
              : r
          ),
        }));
      }
    } catch {}

    // Update local cache
    const current = get().savedRubrics;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },

  deleteRubric: async (id: string) => {
    set((state) => ({
      savedRubrics: state.savedRubrics.filter((r) => r.id !== id),
    }));

    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}${endpoints.saved}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}

    const current = get().savedRubrics;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  },

  isRubricSaved: (queryResponseId: string) => {
    return get().savedRubrics.some(
      (r) => r.queryResponseId === queryResponseId || r.id === queryResponseId
    );
  },

  clearAllRubrics: () => {
    set({ savedRubrics: [] });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));

export default useRubricStore;
