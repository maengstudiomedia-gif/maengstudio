"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { extractDateKeysFromEventDetails } from "@/lib/bookingCalendar/extractDateKeysFromEventDetails";
import { calculatePackageTotal, MAX_BOOKING_EVENT_DAYS } from "@/lib/package-event-pricing";
import { calculateExpectedSettlement, calculateInitialPaymentAmount } from "@/lib/transfer-payment";
import { validateBookingEventDatesAction, revalidateBookingCalendarPaths } from "@/app/actions/bookingCalendarActions";

const PAYMENT_WINDOW_MS = 5 * 60 * 60 * 1000;

async function insertInvoiceWithTransferCode(supabaseAdmin: any, invoice: Record<string, unknown>, maxCode: number) {
  if (invoice.payment_method !== "transfer") {
    const { error } = await supabaseAdmin.from("invoices").insert({ ...invoice, transfer_code: null });
    return { error, transferCode: 0 };
  }

  const codeLimit = Math.min(999, Math.ceil(maxCode) - 1);
  if (codeLimit < 1) {
    return { error: { message: "Harga paket terlalu kecil untuk membuat kode transfer tiga digit." }, transferCode: 0 };
  }

  const { data: activeInvoices, error: lookupError } = await supabaseAdmin
    .from("invoices")
    .select("transfer_code")
    .eq("payment_method", "transfer")
    .eq("payment_status", "unpaid")
    .not("transfer_code", "is", null);
  if (lookupError) return { error: lookupError, transferCode: 0 };

  const usedCodes = new Set((activeInvoices || []).map((item: { transfer_code: number }) => Number(item.transfer_code)));
  for (let attempt = 0; attempt < codeLimit; attempt += 1) {
    const availableCodes = Array.from({ length: codeLimit }, (_, index) => index + 1)
      .filter((code) => !usedCodes.has(code));
    if (availableCodes.length === 0) {
      return { error: { message: "Semua kode transfer sedang digunakan. Silakan coba beberapa saat lagi." }, transferCode: 0 };
    }

    const transferCode = availableCodes[Math.floor(Math.random() * availableCodes.length)];
    const { error } = await supabaseAdmin
      .from("invoices")
      .insert({ ...invoice, transfer_code: transferCode });
    if (!error) return { error: null, transferCode };
    if (error.code !== "23505") return { error, transferCode: 0 };
    usedCodes.add(transferCode);
  }

  return { error: { message: "Gagal membuat kode transfer unik. Silakan coba lagi." }, transferCode: 0 };
}

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error: expirationError } = await supabaseAdmin.rpc("expire_overdue_bookings");
  if (expirationError) {
    console.error("Gagal membatalkan pesanan yang melewati batas pembayaran:", expirationError.message);
    return { success: false, message: "Gagal memeriksa batas waktu pembayaran pesanan." };
  }

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

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .maybeSingle();

  return {
    success: true,
    user,
    bookings: bookings || [],
    invoices: invoices || [],
    balance: Number(profile?.balance || 0),
    serverNow: Date.now(),
  };
}

// 2. Fungsi Membuat Pesanan Baru & Otomatisasi Tagihan
export async function createNewBookingAction(payload: any) {
  const supabase = await getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Sesi tidak valid. Silakan login ulang." };

  // Ekstrak data yang dikirim dari form komponen (TabNewBooking)
  const { packageId, events, notes } = payload;
  const paymentPlan = payload.paymentPlan === "full" ? "full" : "dp";
  const paymentMethod = payload.paymentMethod === "cash" ? "cash" : "transfer";

    if (!Array.isArray(events) || events.length === 0) {
     return { success: false, message: "Minimal harus ada satu rangkaian acara." };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: selectedPackage, error: packageError } = await supabaseAdmin
    .from("packages")
    .select("price, allow_extra_days, extra_day_price")
    .eq("id", packageId)
    .maybeSingle();

  if (packageError || !selectedPackage) {
    return { success: false, message: "Paket tidak ditemukan. Silakan pilih paket yang tersedia." };
  }

  const allowExtraDays = selectedPackage.allow_extra_days !== false;
  if (events.length > MAX_BOOKING_EVENT_DAYS || (!allowExtraDays && events.length > 1)) {
    return { success: false, message: "Paket ini tidak mengizinkan jumlah hari event yang dipilih." };
  }
  const totalPrice = calculatePackageTotal(selectedPackage.price, selectedPackage.extra_day_price, events.length, allowExtraDays);
  const dpAmount = totalPrice * 0.5;

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
      client_name: String(payload.clientName || user.user_metadata?.full_name || user.user_metadata?.name || "Klien").trim(),
      client_phone: String(payload.clientPhone || user.phone || "").trim() || null,
      event_type: String(payload.eventType || events[0]?.eventType || "Lainnya"),
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
  const invoiceResult = await insertInvoiceWithTransferCode(supabaseAdmin, {
      booking_id: booking.id,
      user_id: user.id,
      total_amount: totalPrice,
      dp_amount: dpAmount,
      paid_amount: 0,
      payment_plan: paymentPlan,
      payment_method: paymentMethod,
      payment_status: 'unpaid',
      payment_expires_at: new Date(Date.parse(booking.created_at) + PAYMENT_WINDOW_MS).toISOString(),
    }, paymentPlan === "dp" ? totalPrice - dpAmount : 1000);

  if (invoiceResult.error) {
    await supabaseAdmin.from("bookings").delete().eq("id", booking.id);
    return { success: false, message: "Gagal membuat tagihan: " + invoiceResult.error.message };
  }

  revalidateBookingCalendarPaths();
  return {
    success: true,
    message: "Pesanan dan Invois berhasil dibuat!",
    payment: {
      amount: calculateInitialPaymentAmount(totalPrice, dpAmount, paymentPlan, paymentMethod, invoiceResult.transferCode),
      transferCode: paymentMethod === "transfer" ? invoiceResult.transferCode : null,
      settlementAmount: paymentPlan === "dp" && paymentMethod === "transfer"
        ? calculateExpectedSettlement(totalPrice, dpAmount, invoiceResult.transferCode)
        : paymentPlan === "dp" ? totalPrice - dpAmount : 0,
    },
  };
}

// 3. Fungsi booking publik tanpa login
export async function createPublicBookingAction(payload: any) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { packageId, events, notes, name, phone } = payload;
  const paymentPlan = payload.paymentPlan === "full" ? "full" : "dp";
  const paymentMethod = payload.paymentMethod === "cash" ? "cash" : "transfer";
  const publicBookingUserId = process.env.SUPABASE_PUBLIC_BOOKING_USER_ID;

  if (!publicBookingUserId) {
    return {
      success: false,
      message: "Public booking tidak dapat diproses. Konfigurasi user publik belum tersedia."
    };
  }

  if (!name || !phone) return { success: false, message: "Nama dan nomor WhatsApp wajib diisi." };
  if (!Array.isArray(events) || events.length === 0) return { success: false, message: "Minimal harus ada satu rangkaian acara." };

  const { data: selectedPackage, error: packageError } = await supabaseAdmin
    .from("packages")
    .select("price, allow_extra_days, extra_day_price")
    .eq("id", packageId)
    .maybeSingle();
  if (packageError || !selectedPackage) {
    return { success: false, message: "Paket tidak ditemukan. Silakan pilih paket yang tersedia." };
  }
  const allowExtraDays = selectedPackage.allow_extra_days !== false;
  if (events.length > MAX_BOOKING_EVENT_DAYS || (!allowExtraDays && events.length > 1)) {
    return { success: false, message: "Paket ini tidak mengizinkan jumlah hari event yang dipilih." };
  }
  const totalPrice = calculatePackageTotal(selectedPackage.price, selectedPackage.extra_day_price, events.length, allowExtraDays);
  const dpAmount = totalPrice * 0.5;

  const dateKeys = extractDateKeysFromEventDetails(events);
  const cap = await validateBookingEventDatesAction({ dateKeys, excludeBookingId: null });
  if (!cap.success) {
    return { success: false, message: cap.error || "Tanggal pilihan sudah penuh (maks. 2 pesanan per hari). Silakan pilih tanggal lain." };
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert([{
      user_id: publicBookingUserId,
      package_id: packageId,
      service_type: 'public_booking',
      client_name: name,
      client_phone: phone,
      event_details: events,
      notes: notes || null,
      status: 'pending_payment'
    }])
    .select()
    .single();

  if (bookingError) return { success: false, message: "Gagal membuat pesanan publik: " + bookingError.message };
  if (!booking) return { success: false, message: "Kesalahan sistem: booking publik gagal dibuat." };

  const invoiceResult = await insertInvoiceWithTransferCode(supabaseAdmin, {
      booking_id: booking.id,
      user_id: publicBookingUserId,
      total_amount: totalPrice,
      dp_amount: dpAmount,
      paid_amount: 0,
      payment_plan: paymentPlan,
      payment_method: paymentMethod,
      payment_status: 'unpaid',
      payment_expires_at: new Date(Date.parse(booking.created_at) + PAYMENT_WINDOW_MS).toISOString(),
    }, paymentPlan === "dp" ? totalPrice - dpAmount : 1000);

  if (invoiceResult.error) {
    await supabaseAdmin.from('bookings').delete().eq('id', booking.id).then();
    return { success: false, message: "Gagal membuat tagihan: " + invoiceResult.error.message };
  }

  revalidateBookingCalendarPaths();
  return {
    success: true,
    message: "Booking berhasil terkirim. Silakan ikuti instruksi pembayaran sesuai pilihan Anda.",
    payment: {
      amount: calculateInitialPaymentAmount(totalPrice, dpAmount, paymentPlan, paymentMethod, invoiceResult.transferCode),
      transferCode: paymentMethod === "transfer" ? invoiceResult.transferCode : null,
      settlementAmount: paymentPlan === "dp" && paymentMethod === "transfer"
        ? calculateExpectedSettlement(totalPrice, dpAmount, invoiceResult.transferCode)
        : paymentPlan === "dp" ? totalPrice - dpAmount : 0,
    },
  };
}