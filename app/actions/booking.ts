"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { extractDateKeysFromEventDetails } from "@/lib/bookingCalendar/extractDateKeysFromEventDetails";
import { validateBookingEventDatesAction, revalidateBookingCalendarPaths } from "@/app/actions/bookingCalendarActions";

// Helper untuk inisialisasi Supabase di sisi Server (Memastikan RLS berjalan aman)
async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

// 1. Fungsi Mengambil Data Dasbor Klien
export async function getClientDashboardData() {
  const supabase = await getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Unauthorized" };

  // Ambil data pemesanan milik user yang login
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Ambil data tagihan milik user yang sama
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return { success: true, user, bookings: bookings || [], invoices: invoices || [] };
}

// 2. Fungsi Membuat Pesanan Baru & Otomatisasi Tagihan
export async function createNewBookingAction(payload: any) {
  const supabase = await getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Sesi tidak valid. Silakan login ulang." };

  // Ekstrak data yang dikirim dari form komponen (TabNewBooking)
  const { packageId, events, notes, totalPrice, dpAmount } = payload;

  if (!events || events.length === 0) {
     return { success: false, message: "Minimal harus ada satu rangkaian acara." };
  }

  const dateKeys = extractDateKeysFromEventDetails(events);
  const cap = await validateBookingEventDatesAction({ dateKeys, excludeBookingId: null });
  if (!cap.success) {
    return { success: false, message: cap.error || "Tanggal pilihan sudah penuh (maks. 2 pesanan per hari). Silakan pilih tanggal lain." };
  }

  // -- A. Masukkan Data Pemesanan --
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert([{
      user_id: user.id,
      package_id: packageId, // Simpan ID paket dari katalog 
      service_type: 'custom_package', // Fallback agar tidak ditolak check constraint database
      event_details: events,
      notes: notes,
      status: 'pending_payment'
    }])
    .select() // Minta Supabase mengembalikan data yang baru dibuat
    .single(); // Format menjadi objek tunggal

  if (bookingError) return { success: false, message: "Gagal membuat pesanan: " + bookingError.message };
  
  // Validasi pengaman agar tidak crash
  if (!booking) return { success: false, message: "Kesalahan sistem: ID Pesanan gagal diambil." };

  // -- B. Buat Tagihan (Invoice) Terkait --
  const { error: invoiceError } = await supabase
    .from('invoices')
    .insert([{
      booking_id: booking.id,
      user_id: user.id,
      total_amount: totalPrice,
      dp_amount: dpAmount,
      paid_amount: 0,
      payment_status: 'unpaid'
    }]);

  if (invoiceError) return { success: false, message: "Gagal membuat tagihan: " + invoiceError.message };

  revalidateBookingCalendarPaths();
  return { success: true, message: "Pesanan dan Invois berhasil dibuat!" };
}