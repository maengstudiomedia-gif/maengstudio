import { normalizeDateKey } from "./normalizeDateKey";

/** Ambil semua tanggal unik (YYYY-MM-DD) dari `event_details` JSON/array. */
export function extractDateKeysFromEventDetails(raw: unknown): string[] {
  const keys = new Set<string>();
  let list: unknown[] = [];
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    list = raw;
  }
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const d = (item as Record<string, unknown>).date;
    if (typeof d !== "string" || !d.trim()) continue;
    const k = normalizeDateKey(d);
    if (k) keys.add(k);
  }
  return [...keys];
}
