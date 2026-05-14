"use client";

import { daysInMonth, weekdayMondayIndex, WEEK_LABELS_ID } from "./calendarMonthLayout";

export type DayCellMeta = {
  count: number;
  full: boolean;
  /** Admin: daftar nama; publik: boleh kosong */
  clientNames?: string[];
};

type Props = {
  year: number;
  month: number;
  /** Kunci `YYYY-MM-DD` */
  byDate: Map<string, DayCellMeta>;
  /** Tampilkan nama klien di tooltip / ringkas */
  showClientNames?: boolean;
};

function isoKey(y: number, m: number, d: number) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export default function BookingMonthGrid({ year, month, byDate, showClientNames }: Props) {
  const lead = weekdayMondayIndex(year, month);
  const dim = daysInMonth(year, month);
  const cells: (null | number)[] = [...Array(lead).fill(null)];
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full select-none">
      <div className="grid grid-cols-7 gap-1 text-[10px] text-white/40 uppercase tracking-wider mb-2">
        {WEEK_LABELS_ID.map((w) => (
          <div key={w} className="text-center py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} className="aspect-square rounded-lg bg-white/[0.02]" />;
          }
          const key = isoKey(year, month, day);
          const meta = byDate.get(key);
          const isToday = key === todayIso;
          const count = meta?.count ?? 0;
          const full = meta?.full ?? false;
          const title = meta
            ? `${count} pesanan${full ? " (penuh)" : ""}${showClientNames && meta.clientNames?.length ? ` — ${meta.clientNames.join(", ")}` : ""}`
            : "Kosong";

          return (
            <div
              key={key}
              title={title}
              className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-0.5 text-[10px] leading-tight transition-colors ${
                isToday ? "border-amber-500/60 bg-amber-500/10" : "border-white/10 bg-white/[0.03]"
              } ${full ? "ring-1 ring-rose-500/50" : ""}`}
            >
              <span className={`text-[11px] font-semibold ${isToday ? "text-amber-400" : "text-white/80"}`}>{day}</span>
              {count > 0 && (
                <span className={`mt-0.5 px-1 rounded ${full ? "bg-rose-500/30 text-rose-200" : "bg-emerald-500/20 text-emerald-300"}`}>
                  {count}/2
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
