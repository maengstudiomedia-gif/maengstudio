/** Normalisasi ke `YYYY-MM-DD` untuk kunci tanggal. */
export function normalizeDateKey(input: string): string | null {
  const s = String(input || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return null;
  return t.toISOString().slice(0, 10);
}
