/**
 * Saved rubric types.
 */

/** A single row in a parsed rubric table. */
export interface RubricRow {
  cells: string[];
}

/** A fully parsed rubric table extracted from an LLM response. */
export interface ParsedRubricTable {
  headers: string[];
  rows: RubricRow[];
}

/** A saved rubric entry persisted to storage. */
export interface SavedRubric {
  id: string;
  question: string;
  queryResponseId: string;
  table: ParsedRubricTable;
  savedAt: string;
}
