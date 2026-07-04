/**
 * Minimal RFC-4180 CSV parser (dependency-free).
 *
 * Handles quoted fields with embedded commas/quotes/newlines, `""` escapes,
 * CRLF or LF line endings, and a leading UTF-8 BOM. Returns one object per data
 * row, keyed by the header. Mirrors Python's csv.DictReader for our inputs.
 */
export type Row = Record<string, string>;

export function parseCsv(text: string): Row[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let sawField = false; // did the current row have any content?

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
      sawField = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      sawField = true;
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      sawField = false;
    } else if (c === "\r") {
      // ignore; CRLF handled by the \n branch
    } else {
      field += c;
      sawField = true;
    }
  }
  if (sawField || field.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const o: Row = {};
    header.forEach((h, j) => {
      o[h] = r[j] ?? "";
    });
    return o;
  });
}
