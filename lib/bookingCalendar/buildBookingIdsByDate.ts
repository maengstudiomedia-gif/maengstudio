import { extractDateKeysFromEventDetails } from "./extractDateKeysFromEventDetails";

export type BookingRowLite = { id: string; event_details?: unknown };

/** Map tanggal → set id pesanan yang punya acara di tanggal itu. */
export function buildBookingIdsByDate(rows: BookingRowLite[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row?.id) continue;
    for (const dk of extractDateKeysFromEventDetails(row.event_details)) {
      if (!map.has(dk)) map.set(dk, new Set());
      map.get(dk)!.add(String(row.id));
    }
  }
  return map;
}
