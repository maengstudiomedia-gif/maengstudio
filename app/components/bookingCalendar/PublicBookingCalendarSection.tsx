"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import BookingMonthGrid, { type DayCellMeta } from "./BookingMonthGrid";
import type { PublicDaySummary } from "@/lib/bookingCalendar/buildPublicDaySummaries";
import { getPublicBookingCalendarAction } from "@/app/actions/bookingCalendarActions";

export default function PublicBookingCalendarSection() {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [days, setDays] = useState<PublicDaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getPublicBookingCalendarAction();
      if (!cancelled && res.success) setDays(res.days);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, DayCellMeta>();
    for (const d of days) {
      m.set(d.date, { count: d.count, full: d.full });
    }
    return m;
  }, [days]);

  const label = new Date(cursor.y, cursor.m, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Kalender ketersediaan</h3>
          <p className="text-sm text-white/45 mt-1">Maksimal 2 pesanan per tanggal acara. Angka menunjukkan slot terpakai.</p>
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
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <BookingMonthGrid year={cursor.y} month={cursor.m} byDate={byDate} showClientNames={false} />
      )}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/50">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40" /> Ada slot
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50 ring-1 ring-rose-500/40" /> Penuh (2/2)
        </span>
      </div>
    </div>
  );
}
