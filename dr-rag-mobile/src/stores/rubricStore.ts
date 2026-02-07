/**
 * Saved rubrics store using Zustand with persist middleware.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedRubric, ParsedRubricTable } from '../types/rubric';

interface RubricStore {
  savedRubrics: SavedRubric[];

  saveRubric: (
    question: string,
    queryResponseId: string,
    table: ParsedRubricTable
  ) => void;
  deleteRubric: (id: string) => void;
  isRubricSaved: (queryResponseId: string) => boolean;
  clearAllRubrics: () => void;
}

const MAX_SAVED_RUBRICS = 50;

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

export const useRubricStore = create<RubricStore>()(
  persist(
    (set, get) => ({
      savedRubrics: [],

      saveRubric: (
        question: string,
        queryResponseId: string,
        table: ParsedRubricTable
      ) => {
        if (get().isRubricSaved(queryResponseId)) return;

        const rubric: SavedRubric = {
          id: generateId(),
          question,
          queryResponseId,
          table,
          savedAt: new Date().toISOString(),
        };

        set((state) => ({
          savedRubrics: [rubric, ...state.savedRubrics].slice(
            0,
            MAX_SAVED_RUBRICS
          ),
        }));
      },

      deleteRubric: (id: string) => {
        set((state) => ({
          savedRubrics: state.savedRubrics.filter((r) => r.id !== id),
        }));
      },

      isRubricSaved: (queryResponseId: string) => {
        return get().savedRubrics.some(
          (r) => r.queryResponseId === queryResponseId
        );
      },

      clearAllRubrics: () => {
        set({ savedRubrics: [] });
      },
    }),
    {
      name: 'dr-rag-saved-rubrics',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

export default useRubricStore;
