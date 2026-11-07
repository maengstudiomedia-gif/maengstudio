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
    <div className="rounded-[18px] border border-[#e3ebe5] bg-white p-3.5 shadow-[0_4px_12px_rgba(24,39,31,0.035)] sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-[15px] font-bold text-[#18271f]">Kalender ketersediaan</h3>
          <p className="text-[10px] text-[#819087] mt-1">Maksimal 2 pesanan per tanggal. Angka menunjukkan slot terpakai.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-[10px] bg-[#f1f6f2] hover:bg-[#e6f1e9] text-[#087b45]"
            onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-[#34453b] min-w-[120px] text-center capitalize">{label}</span>
          <button
            type="button"
            className="p-2 rounded-[10px] bg-[#f1f6f2] hover:bg-[#e6f1e9] text-[#087b45]"
            onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-[#087b45]" />
        </div>
      ) : (
        <BookingMonthGrid year={cursor.y} month={cursor.m} byDate={byDate} showClientNames={false} tone="light" />
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-[#718078]">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Ada slot
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" /> Penuh (2/2)
        </span>
      </div>
    </div>
  );
}
