import { MAX_BOOKINGS_PER_EVENT_DATE } from "./constants";
import type { BookingRowLite } from "./buildBookingIdsByDate";
import { buildBookingIdsByDate } from "./buildBookingIdsByDate";

export type PublicDaySummary = { date: string; count: number; full: boolean };

/** Ringkasan per tanggal untuk tampilan publik (tanpa nama klien). */
export function buildPublicDaySummaries(rows: BookingRowLite[]): PublicDaySummary[] {
  const map = buildBookingIdsByDate(rows);
  const out: PublicDaySummary[] = [];
  for (const [date, ids] of map) {
    const count = ids.size;
    out.push({ date, count, full: count >= MAX_BOOKINGS_PER_EVENT_DATE });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
