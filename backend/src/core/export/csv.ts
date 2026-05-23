/** Minimal RFC-4180 CSV serializer (pure, dependency-free, deterministic). */
function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s =
    v instanceof Date ? v.toISOString()
    : typeof v === 'object' ? JSON.stringify(v)
    : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? (rows.length ? Object.keys(rows[0]) : []);
  const head = cols.map(cell).join(',');
  const body = rows.map((r) => cols.map((c) => cell(r[c])).join(','));
  return [head, ...body].join('\r\n');
}

export function toJson(rows: unknown[]): string {
  return JSON.stringify(rows);
}
