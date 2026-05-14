"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin, getErrorMessage } from "@/app/actions/adminBookings/utils";
import { buildBookingIdsByDate } from "@/lib/bookingCalendar/buildBookingIdsByDate";
import { buildPublicDaySummaries } from "@/lib/bookingCalendar/buildPublicDaySummaries";
import { buildAdminCalendarDayEntries } from "@/lib/bookingCalendar/buildAdminCalendarDayEntries";
import { validateDatesAgainstCapacity } from "@/lib/bookingCalendar/validateDatesAgainstCapacity";

async function fetchBookingsForCalendar() {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, client_name, event_details");
  if (error) throw new Error(error.message);
  return (data || []) as Array<{ id: string; client_name?: string | null; event_details: unknown }>;
}

/** Kalender publik: per tanggal jumlah pesanan & status penuh (tanpa nama). */
export async function getPublicBookingCalendarAction() {
  try {
    const rows = await fetchBookingsForCalendar();
    const days = buildPublicDaySummaries(rows);
    return { success: true as const, days };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), days: [] };
  }
}

/** Kalender admin: tanggal + nama klien (maks tampilan mengikuti kapasitas). */
export async function getAdminBookingCalendarAction() {
  try {
    const rows = await fetchBookingsForCalendar();
    const days = buildAdminCalendarDayEntries(rows);
    return { success: true as const, days };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), days: [] };
  }
}

export type ValidateBookingDatesPayload = {
  /** Tanggal `YYYY-MM-DD` dari semua rangkaian acara */
  dateKeys: string[];
  /** Saat edit pesanan, abaikan hitungan untuk id ini */
  excludeBookingId?: string | null;
};

/** Cek ketersediaan sebelum simpan jadwal (dipakai form admin / klien). */
export async function validateBookingEventDatesAction(payload: ValidateBookingDatesPayload) {
  try {
    const dateKeys = Array.isArray(payload.dateKeys) ? payload.dateKeys.filter(Boolean) : [];
    if (dateKeys.length === 0) return { success: true as const };

    const rows = await fetchBookingsForCalendar();
    const byDate = buildBookingIdsByDate(rows);
    const v = validateDatesAgainstCapacity(dateKeys, byDate, payload.excludeBookingId ?? null);
    if (v.ok) return { success: true as const };

    const label = v.fullDates.join(", ");
    return {
      success: false as const,
      error: `Kuota tanggal penuh (maks. 2 pesanan/hari): ${label}`,
      fullDates: v.fullDates,
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), fullDates: [] as string[] };
  }
}

/** Panggil setelah booking berubah agar halaman beranda ikut segar. */
export async function revalidateBookingCalendarPaths() {
  revalidatePath("/");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/packages");
  revalidatePath("/client/profile");
}