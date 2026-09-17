"use server";

import { revalidatePath } from "next/cache";
import { 
  supabaseAdmin, getErrorMessage, parseEventDetails, parseProcessMeta, 
  mergeProcessMetaAsNotes, mergeBookingNotesPatch, STORAGE_BUCKET, BookingProcessMeta, requireAdminOrSales
} from "./utils";

function normalizePhone(value: unknown): string {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.startsWith("62") ? `0${digits.slice(2)}` : digits;
}

// --- FUNGSI BARU: MEMBUAT PESANAN ADMIN ---
export async function createAdminBookingAction(payload: any) {
  try {
    const { user, role } = await requireAdminOrSales();
    const ownerId = role === "sales" ? user.id : payload.userId;
    const clientPhone = normalizePhone(payload.client_phone);
    if (!payload.client_name || !clientPhone) return { success: false, error: "Nama dan nomor HP wajib diisi." };

    const [{ data: leads, error: leadsError }, { data: bookings, error: bookingsError }] = await Promise.all([
      supabaseAdmin.from("leads").select("id, client_name, client_phone, status, created_at").not("client_phone", "is", null),
      supabaseAdmin.from("bookings").select("id, client_name, client_phone, status, created_at, invoice_number").not("client_phone", "is", null),
    ]);
    if (leadsError) throw leadsError;
    if (bookingsError) throw bookingsError;
    const duplicate = [...(leads || []), ...(bookings || [])].find((record) => normalizePhone(record.client_phone) === clientPhone);
    if (duplicate) return { success: false, error: "Nomor HP sudah digunakan.", duplicate };
    // 1. Ambil detail Paket Utama untuk Snapshot (Nama, Harga, Tipe)
    const { data: mainPkg, error: mainPkgError } = await supabaseAdmin
      .from("packages")
      .select("name, price, type")
      .eq("id", payload.package_id)
      .single();

    if (mainPkgError && payload.package_id) {
      console.warn("Gagal mengambil paket utama:", mainPkgError);
    }

    // 2. Ambil detail Paket Tambahan (Add-ons) untuk Snapshot
    let addonSnapshots: any[] = [];
    if (payload.addon_package_ids && payload.addon_package_ids.length > 0) {
      const { data: addons, error: addonsError } = await supabaseAdmin
        .from("packages")
        .select("id, name, price")
        .in("id", payload.addon_package_ids);
      
      if (addons && !addonsError) addonSnapshots = addons;
    }

    // 3. Masukkan data ke tabel Bookings beserta JSONB Snapshot
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: ownerId,
        invoice_number: payload.invoice_number,
        service_type: payload.service_type,
        
        // --- SNAPSHOT DATA ---
        package_snapshot: mainPkg ? { name: mainPkg.name, price: mainPkg.price, type: mainPkg.type } : null,
        addon_packages: addonSnapshots,
        // ---------------------

        client_name: payload.client_name,
        client_phone: clientPhone,
        event_type: payload.event_type,
        custom_event_type: payload.custom_event_type,
        booker_type: payload.booker_type,
        bride_name: payload.bride_name,
        groom_name: payload.groom_name,
        event_details: JSON.stringify(payload.event_details),
        status: "pending_payment",
      })
      .select()
      .single();

    if (bookingError) throw new Error(bookingError.message);

    // 4. Masukkan data ke tabel Invoices
    const { error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        booking_id: booking.id,
        user_id: ownerId,
        total_amount: payload.total_price, // Diambil dari total kalkulasi di form admin
        dp_amount: 0,
        paid_amount: 0,
        payment_status: "unpaid",
      });

    if (invoiceError) throw new Error(invoiceError.message);

    // 5. Refresh halaman UI Admin
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- FUNGSI UPDATE PEMBAYARAN ---
export async function updateBookingPaymentAction(bookingId: string, paymentType: "dp" | "lunas", amount?: number) {
  try {
    await requireAdmin();
    if (!bookingId) return { success: false, error: "ID pesanan tidak ditemukan." };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings").select("id,event_details,status,notes").eq("id", bookingId).single();
    if (bookingError) throw new Error(bookingError.message);

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices").select("*").eq("booking_id", bookingId).single();
    if (invoiceError) throw new Error(invoiceError.message);

    const totalAmount = Number(invoice.total_amount || 0);
    let nextPaid = Number(invoice.paid_amount || 0);
    let nextStatus = invoice.payment_status || "unpaid";

    if (paymentType === "lunas") {
      nextPaid = totalAmount;
      nextStatus = "paid"; 
    } else if (paymentType === "dp") {
      nextPaid = Number(amount || 0);
      nextStatus = nextPaid >= totalAmount ? "paid" : "unpaid";
    }

    let notesForProcess: unknown = booking.notes;

    if (paymentType === "dp") {
      notesForProcess = mergeBookingNotesPatch(notesForProcess, { dp_paid_amount: nextPaid });
    }

    if (paymentType === "lunas") {
      const prevPaid = Number(invoice.paid_amount || 0);
      let existingDp: number | undefined;
      try {
        const n = typeof notesForProcess === "string" ? JSON.parse(notesForProcess) : notesForProcess;
        if (n && typeof n === "object" && typeof (n as { dp_paid_amount?: unknown }).dp_paid_amount === "number") {
          existingDp = (n as { dp_paid_amount: number }).dp_paid_amount;
        }
      } catch {
        /* abaikan */
      }
      const dpRecorded = typeof existingDp === "number" && !Number.isNaN(existingDp) ? existingDp : prevPaid;
      notesForProcess = mergeBookingNotesPatch(notesForProcess, { dp_paid_amount: dpRecorded });
    }

    const eventDates = parseEventDetails(booking.event_details)
      .map((e) => e?.date)
      .filter((d): d is string => typeof d === "string" && d.length > 0)
      .map((d) => new Date(d).getTime())
      .filter((t) => !Number.isNaN(t));
    
    if (eventDates.length) {
      const diffMs = Math.min(...eventDates) - Date.now();
      if (paymentType === "dp" && (totalAmount - nextPaid) > 0 && diffMs <= 86400000) {
        return { success: false, error: "Pesanan sudah H-1. Pembayaran wajib pelunasan." };
      }
    }

    // UPDATE DATABASE
    const { error: updateInvoiceError } = await supabaseAdmin
      .from("invoices")
      .update({ paid_amount: nextPaid, payment_status: nextStatus })
      .eq("id", invoice.id);

    // MENGHAPUS TOPENG ERROR AGAR PESAN ASLI DARI DATABASE MUNCUL
    if (updateInvoiceError) {
       return { success: false, error: `[DB Error] ${updateInvoiceError.message} (Dikirim: ${nextStatus})` };
    }

    if (nextStatus === "paid") {
      const currentProcess = parseProcessMeta(notesForProcess);
      const nextProcess: BookingProcessMeta = {
        ...currentProcess,
        stage: currentProcess.stage === "picked_up" ? "picked_up" : currentProcess.stage === "completed" ? "completed" : "awaiting_settlement",
        paidOffAt: currentProcess.paidOffAt || new Date().toISOString(),
      };
      const finalNotes = mergeProcessMetaAsNotes(notesForProcess, nextProcess);
      await supabaseAdmin.from("bookings").update({
        status: "locked", notes: finalNotes,
      }).eq("id", booking.id);
    } else if (paymentType === "dp" || paymentType === "lunas") {
      await supabaseAdmin.from("bookings").update({ notes: notesForProcess as string }).eq("id", booking.id);
    }

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- FUNGSI UPDATE STATUS PROSES (EDIT/PRINT/PICKUP) ---
export async function updateBookingProcessAction(
  bookingId: string, actionType: "start_edit" | "start_print" | "finish" | "picked_up", pickupProofUrl?: string
) {
  try {
    await requireAdmin();
    const [{ data: booking, error: bErr }, { data: invoice, error: iErr }] = await Promise.all([
      supabaseAdmin.from("bookings").select("id,status,notes").eq("id", bookingId).single(),
      supabaseAdmin.from("invoices").select("payment_status").eq("booking_id", bookingId).single(),
    ]);

    if (bErr) throw new Error(bErr.message);
    if (iErr) throw new Error(iErr.message);
    if (invoice.payment_status !== "paid") return { success: false, error: "Proses hanya bisa dilanjutkan setelah lunas." };

    const currentProcess = parseProcessMeta(booking.notes);
    const now = new Date().toISOString();
    let nextProcess: BookingProcessMeta = { ...currentProcess };
    let nextStatus = booking.status || "locked";

    if (actionType === "start_edit") {
      if (currentProcess.stage !== "awaiting_settlement") return { success: false, error: "Status harus menunggu pelunasan." };
      nextProcess = { ...currentProcess, stage: "edit_process", editStartedAt: now };
    } else if (actionType === "start_print") {
      if (currentProcess.stage !== "edit_process") return { success: false, error: "Harus diedit dulu." };
      nextProcess = { ...currentProcess, stage: "print_process", printStartedAt: now };
    } else if (actionType === "finish") {
      if (currentProcess.stage !== "print_process") return { success: false, error: "Harus dalam tahap percetakan terlebih dahulu." };
      nextProcess = { ...currentProcess, stage: "completed", completedAt: now };
      nextStatus = "completed";
    } else if (actionType === "picked_up") {
      if (!pickupProofUrl) return { success: false, error: "Bukti wajib diunggah." };
      nextProcess = { ...currentProcess, stage: "picked_up", pickedUpAt: now, pickupProofUrl };
      nextStatus = "completed";
    }

    const { error } = await supabaseAdmin.from("bookings").update({ status: nextStatus, notes: mergeProcessMetaAsNotes(booking.notes, nextProcess) }).eq("id", bookingId);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- FUNGSI UPLOAD BUKTI PENGAMBILAN ---
export async function uploadPickupProofAction(formData: FormData) {
  try {
    await requireAdmin();
    const bookingId = String(formData.get("bookingId") || "");
    const file = formData.get("file") as File | null;
    if (!bookingId || !file || file.size === 0) return { success: false, error: "File bukti wajib dipilih." };

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) return { success: false, error: "Format bukti harus JPG, PNG, atau WebP." };
    if (file.size > 10 * 1024 * 1024) return { success: false, error: "Ukuran bukti maksimal 10 MB." };

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `pickups/${bookingId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(path, file);
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}