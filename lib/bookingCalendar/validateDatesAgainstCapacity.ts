import { MAX_BOOKINGS_PER_EVENT_DATE } from "./constants";

/**
 * Cek apakah tanggal-tanggal baru masih di bawah kapasitas.
 * `byDate`: hasil `buildBookingIdsByDate` — tiap tanggal berisi id pesanan yang sudah terjadwal.
 */
export function validateDatesAgainstCapacity(
  proposedDateKeys: string[],
  byDate: Map<string, Set<string>>,
  excludeBookingId?: string | null
): { ok: true } | { ok: false; fullDates: string[] } {
  const unique = [...new Set(proposedDateKeys.filter(Boolean))];
  const full: string[] = [];
  for (const d of unique) {
    const set = new Set(byDate.get(d) || []);
    if (excludeBookingId) set.delete(String(excludeBookingId));
    if (set.size >= MAX_BOOKINGS_PER_EVENT_DATE) full.push(d);
  }
  return full.length ? { ok: false, fullDates: full } : { ok: true };
}
