import { MAX_BOOKINGS_PER_EVENT_DATE } from "./constants";
import { extractDateKeysFromEventDetails } from "./extractDateKeysFromEventDetails";

export type AdminDayEntry = {
  date: string;
  count: number;
  full: boolean;
  clientNames: string[];
};

type Row = { id: string; client_name?: string | null; event_details?: unknown };

export function buildAdminCalendarDayEntries(rows: Row[]): AdminDayEntry[] {
  const byDate = new Map<string, Map<string, string>>();

  for (const row of rows) {
    const id = String(row.id);
    const name = String(row.client_name || "Tanpa nama").trim() || "Tanpa nama";
    for (const dk of extractDateKeysFromEventDetails(row.event_details)) {
      if (!byDate.has(dk)) byDate.set(dk, new Map());
      byDate.get(dk)!.set(id, name);
    }
  }

  const out: AdminDayEntry[] = [];
  for (const [date, idToName] of byDate) {
    const clientNames = [...idToName.values()];
    const count = idToName.size;
    out.push({
      date,
      count,
      full: count >= MAX_BOOKINGS_PER_EVENT_DATE,
      clientNames,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
