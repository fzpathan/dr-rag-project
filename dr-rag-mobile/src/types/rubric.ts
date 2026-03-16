/**
 * Saved rubric types.
 */

export interface RubricRow {
  cells: string[];
}

export interface ParsedRubricTable {
  headers: string[];
  rows: RubricRow[];
}

/** A saved rubric entry — mirrors the server schema. */
export interface SavedRubric {
  id: string;
  name: string;
  question: string;
  answer: string;
  citations: any[];
  queryResponseId: string;
  table: ParsedRubricTable | null;
  savedAt: string;
}
