"use client";

import { useEffect, useState } from "react";
import { extractDateKeysFromEventDetails } from "@/lib/bookingCalendar/extractDateKeysFromEventDetails";
import { validateBookingEventDatesAction } from "@/app/actions/bookingCalendarActions";

type Ev = { date?: string };

/** Cek cepat ketersediaan tanggal saat mengisi jadwal (debounce). */
export default function EventDateAvailabilityHint({ events, excludeBookingId }: { events: Ev[]; excludeBookingId?: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      const dateKeys = extractDateKeysFromEventDetails(events);
      if (dateKeys.length === 0) {
        setMsg(null);
        return;
      }
      const res = await validateBookingEventDatesAction({ dateKeys, excludeBookingId: excludeBookingId ?? null });
      if (res.success) {
        setOk(true);
        setMsg("Tanggal yang dipilih masih memenuhi kuota (maks. 2 pesanan/hari).");
      } else {
        setOk(false);
        setMsg(res.error || "Tanggal penuh.");
      }
    }, 450);
    return () => clearTimeout(t);
  }, [events, excludeBookingId]);

  if (!msg) return null;

  return (
    <p className={`text-xs rounded-xl px-4 py-2 border ${ok ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200/90" : "border-rose-500/30 bg-rose-500/10 text-rose-200/90"}`}>
      {msg}
    </p>
  );
}
