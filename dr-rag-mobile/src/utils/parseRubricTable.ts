/**
 * Parse the repertorization markdown table from an LLM response.
 */

import type { ParsedRubricTable } from '../types/rubric';

/**
 * Extracts and parses the markdown table under "## Repertorization".
 *
 * @param answer - The full markdown answer string from QueryResponse.answer
 * @returns ParsedRubricTable if a valid table is found, or null if parsing fails
 */
export function parseRubricTable(answer: string): ParsedRubricTable | null {
  const lines = answer.split('\n');

  // Find the repertorization section
  let sectionStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+Repertorization/i.test(lines[i].trim())) {
      sectionStart = i + 1;
      break;
    }
  }

  if (sectionStart === -1) return null;

  // Collect lines until next section boundary (## heading or --- rule)
  const sectionLines: string[] = [];
  for (let i = sectionStart; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^##\s/.test(trimmed) || /^---+$/.test(trimmed)) break;
    sectionLines.push(trimmed);
  }

  // Extract table rows (lines starting with "|")
  const tableLines = sectionLines.filter((line) => line.startsWith('|'));
  if (tableLines.length < 2) return null;

  const parseCells = (line: string): string[] =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

  const isSeparator = (line: string): boolean =>
    parseCells(line).every((cell) => /^[-:\s]+$/.test(cell));

  const headers = parseCells(tableLines[0]);
  const dataLines = tableLines.slice(1).filter((line) => !isSeparator(line));

  if (headers.length === 0 || dataLines.length === 0) return null;

  const rows = dataLines.map((line) => {
    const cells = parseCells(line);
    // Pad to match header count
    return { cells: headers.map((_, i) => cells[i] ?? '') };
  });

  return { headers, rows };
}

/**
 * Quick check: does this answer contain a repertorization table?
 */
export function hasRubricTable(answer: string): boolean {
  return /^##\s+Repertorization/im.test(answer);
}
