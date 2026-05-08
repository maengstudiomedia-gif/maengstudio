// file: app/actions/adminBookings/coreActions.ts
"use server";

import { revalidatePath } from "next/cache";
import { 
  supabaseAdmin, getErrorMessage, parseProcessMeta, parseEventDetails,
  BookingPayload, UpdateBookingPayload 
} from "./utils";

export async function generateInvoiceNumberAction() {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, '0');         // 2 digit tanggal
  const mm = String(date.getMonth() + 1).padStart(2, '0');    // 2 digit bulan
  const yyyy = String(date.getFullYear());                    // 4 digit tahun

  // Cari nota terakhir di tahun yang sama dengan pola yang baru
  const { data: lastBooking } = await supabaseAdmin
    .from('bookings')
    .select('invoice_number')
    .ilike('invoice_number', `%E${yyyy}N%G`) // Mencari yang format tahun dan N..G nya cocok
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNumber = 1;
  if (lastBooking && lastBooking.invoice_number) {
    // Ekstrak 3 digit urutan (angka setelah 'N' dan sebelum 'G')
    const match = lastBooking.invoice_number.match(/N(\d{3})G$/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format nomor urut jadi 3 digit (contoh: 001, 002, 010)
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  
  // Rangkai string menjadi tepat 16 Karakter: M(2) A(2) E(4) N(3) G(1) -> 1+2+1+2+1+4+1+3+1 = 16
  return `M${dd}A${mm}E${yyyy}N${formattedNumber}G`;
}

export async function createAdminBookingAction(payload: BookingPayload) {
  try {
    const { 
      userId, invoice_number, package_id, service_type, client_name, client_phone, 
      event_type, custom_event_type, booker_type, bride_name, groom_name, event_details, total_price
    } = payload;

    if (!userId || !package_id || !client_name || !client_phone || !Array.isArray(event_details) || event_details.length === 0) {
      return { success: false, error: "Data pemesanan tidak lengkap." };
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert([{
        user_id: userId, invoice_number, package_id, service_type, client_name, client_phone,
        event_type, custom_event_type, booker_type, bride_name, groom_name, event_details,
        status: 'pending_payment'
      }]).select().single();

    if (bookingError) throw new Error(bookingError.message);

    const { error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert([{
        booking_id: booking.id, user_id: userId, total_amount: total_price,
        dp_amount: total_price * 0.5, paid_amount: 0, payment_status: 'unpaid'
      }]);

    if (invoiceError) throw new Error(invoiceError.message);

    revalidatePath("/admin/packages");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getAdminBookingsAction() {
  try {
    const [{ data: bookings, error: bookingError }, { data: invoices, error: invoiceError }, { data: packages }] = await Promise.all([
      supabaseAdmin.from("bookings").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("invoices").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("packages").select("id,name,type"),
    ]);

    if (bookingError) throw new Error(bookingError.message);
    if (invoiceError) throw new Error(invoiceError.message);

    const invoiceRows = (invoices || []) as Array<Record<string, unknown>>;
    const packageRows = (packages || []) as Array<Record<string, unknown>>;
    const bookingRows = (bookings || []) as Array<Record<string, unknown>>;

    const invoiceMap = new Map(invoiceRows.map((invoice) => [String(invoice.booking_id || ""), invoice]));
    const packageMap = new Map(packageRows.map((pkg) => [String(pkg.id || ""), pkg]));

    const rows = bookingRows.map((booking) => {
      const invoice = invoiceMap.get(String(booking.id || "")) || null;
      const pkg = packageMap.get(String(booking.package_id || "")) || null;
      return {
        ...booking,
        package_name: String(pkg?.name || "-"),
        package_type: String(pkg?.type || booking.service_type || "-"),
        invoice,
        process: parseProcessMeta(booking.notes),
      };
    });

    return { success: true, data: rows };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error), data: [] };
  }
}

export async function updateAdminBookingAction(payload: UpdateBookingPayload) {
  try {
    const { id, ...updates } = payload;
    if (!id) return { success: false, error: "ID pesanan tidak ditemukan." };

    const { error } = await supabaseAdmin.from("bookings").update(updates).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteAdminBookingAction(bookingId: string) {
  try {
    if (!bookingId) return { success: false, error: "ID pesanan tidak ditemukan." };

    const { error: invoiceError } = await supabaseAdmin.from("invoices").delete().eq("booking_id", bookingId);
    if (invoiceError) throw new Error(invoiceError.message);

    const { error: bookingError } = await supabaseAdmin.from("bookings").delete().eq("id", bookingId);
    if (bookingError) throw new Error(bookingError.message);

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function findInvoiceByNumberAction(invoiceNumber: string) {
  try {
    if (!invoiceNumber) return { success: false, error: "Nomor nota wajib diisi." };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings").select("*").eq("invoice_number", invoiceNumber.trim()).maybeSingle();

    if (bookingError) throw new Error(bookingError.message);
    if (!booking) return { success: false, error: "Nota tidak ditemukan." };

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices").select("*").eq("booking_id", booking.id).maybeSingle();

    if (invoiceError) throw new Error(invoiceError.message);

    const paidAmount = Number(invoice?.paid_amount || 0);
    const totalAmount = Number(invoice?.total_amount || 0);
    const process = parseProcessMeta(booking.notes);
    
    // --- MENGHITUNG COUNTDOWN MUTLAK DARI TANGGAL ACARA ---
    const eventDetails = parseEventDetails(booking.event_details);
    const eventDates = eventDetails
      .map((e: any) => e?.date ? new Date(e.date).getTime() : NaN)
      .filter((n: number) => !isNaN(n));
      
    let firstEventMs: number | null = null;
    let lastEventMs: number | null = null;

    if (eventDates.length > 0) {
      firstEventMs = Math.min(...eventDates);
      lastEventMs = Math.max(...eventDates);
    }

    const todayMs = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Batas H-1 Acara Pertama
    const hMinus1Ms = firstEventMs ? firstEventMs - oneDay : null;
    const dpDaysLeft = hMinus1Ms ? Math.ceil((hMinus1Ms - todayMs) / oneDay) : null;

    // Batas Edit: Max 15 hari dari Acara Terakhir
    const editDeadlineMs = lastEventMs ? lastEventMs + (15 * oneDay) : null;
    const editDaysLeft = editDeadlineMs ? Math.ceil((editDeadlineMs - todayMs) / oneDay) : null;
    const editDeadlineDate = editDeadlineMs ? new Date(editDeadlineMs).toISOString() : null; // Kirim tanggal pastinya

    // Batas Cetak: Max 40 hari dari Acara Terakhir
    const printDeadlineMs = lastEventMs ? lastEventMs + (40 * oneDay) : null;
    const printDaysLeft = printDeadlineMs ? Math.ceil((printDeadlineMs - todayMs) / oneDay) : null;
    const printDeadlineDate = printDeadlineMs ? new Date(printDeadlineMs).toISOString() : null; // Kirim tanggal pastinya
    // -----------------------------------------

    let progressLabel = "Menunggu Pelunasan";
    if (process.stage === "edit_process") progressLabel = "Proses Edit";
    if (process.stage === "print_process") progressLabel = "Proses Cetak";
    if (process.stage === "completed") progressLabel = "Pesanan Selesai - Silahkan ambil di Galeri";
    if (process.stage === "picked_up") progressLabel = "Sudah Diambil";

    return {
      success: true,
      data: {
        booking, 
        invoice,
        payment: { 
          total: totalAmount, 
          paid: paidAmount, 
          remaining: Math.max(totalAmount - paidAmount, 0), 
          status: invoice?.payment_status || "unpaid" 
        },
        process, 
        progressLabel,
        countdown: { 
          dpDaysLeft, 
          editDaysLeft, 
          printDaysLeft,
          editDeadlineDate,  // Ditambahkan
          printDeadlineDate  // Ditambahkan
        } 
      },
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}