/**
  * Utility functions for CSV sanitization, parsing, and anti-injection (OWASP CSV Injection)
  */

/**
 * Escapes cells against OWASP CSV / Formula Injection.
 * If a cell string starts with =, +, -, @, \t, or \r, a single quote (') is prepended.
 * Also handles standard CSV quoting (commas, quotes, newlines).
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val).trim();

  // Anti-Formula Injection (OWASP)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Double quotes inside strings
  if (str.includes('"')) {
    str = str.replace(/"/g, '""');
  }

  // Quote the entire string if it contains commas, newlines, or quotes
  if (/[",\n\r]/.test(str) || str.startsWith("'")) {
    return `"${str}"`;
  }

  return str;
}

/**
 * Robust CSV parser supporting quotes, escaped quotes (""), and standard row/column delimiters.
 */
export function parseCsvContent(csvString: string): Array<Record<string, string>> {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    const nextChar = csvString[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const result: Array<Record<string, string>> = [];

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    const item: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      item[headers[c]] = row[c] !== undefined ? row[c] : '';
    }
    result.push(item);
  }

  return result;
}
