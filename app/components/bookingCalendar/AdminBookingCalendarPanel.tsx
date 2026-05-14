"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BookingMonthGrid, { type DayCellMeta } from "./BookingMonthGrid";
import { buildAdminCalendarDayEntries } from "@/lib/bookingCalendar/buildAdminCalendarDayEntries";

type Row = { id: string; client_name?: string | null; event_details?: unknown };

export default function AdminBookingCalendarPanel({ bookings }: { bookings: Row[] }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  const byDate = useMemo(() => {
    const entries = buildAdminCalendarDayEntries(bookings);
    const m = new Map<string, DayCellMeta>();
    for (const e of entries) {
      m.set(e.date, { count: e.count, full: e.full, clientNames: e.clientNames });
    }
    return m;
  }, [bookings]);

  const label = new Date(cursor.y, cursor.m, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-medium text-white">Kalender jadwal acara</h3>
          <p className="text-sm text-white/45 mt-1">Semua tanggal dari rangkaian acara (multi-hari). Maks. 2 pesanan per tanggal.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
            onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-white/80 min-w-[140px] text-center capitalize">{label}</span>
          <button
            type="button"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
            onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <BookingMonthGrid year={cursor.y} month={cursor.m} byDate={byDate} showClientNames />
    </div>
  );
}
