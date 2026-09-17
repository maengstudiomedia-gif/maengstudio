"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin, getErrorMessage } from "./adminBookings/utils"; // Sesuaikan path utils Anda
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi tidak valid.");
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "sales"].includes(profile.role)) throw new Error("Akses admin atau sales diperlukan.");
  return { user, role: profile.role };
}

function monthBounds(monthOffset: number) {
  const safeOffset = Number.isInteger(monthOffset) ? Math.min(0, Math.max(-24, monthOffset)) : 0;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + safeOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + safeOffset + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function normalizePhone(value: unknown): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

// Fungsi getLeadsAction sudah diperbarui untuk melakukan JOIN ke tabel packages
export async function getLeadsAction(monthOffset = 0) {
  try {
    const { user, role } = await getCurrentUser();
    const bounds = monthBounds(monthOffset);
    let query = supabaseAdmin
      .from("leads")
      .select(`
        *,
        packages:interested_package_id (
          name,
          price
        )
      `)
      .gte("created_at", bounds.start)
      .lt("created_at", bounds.end)
      .order("created_at", { ascending: false });
    if (role === "sales") query = query.eq("created_by", user.id);
    const { data, error } = await query;

    if (error) throw new Error(error.message);
    const creatorIds = [...new Set((data || []).map((lead) => lead.created_by).filter(Boolean))];
    const { data: creators } = creatorIds.length ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", creatorIds) : { data: [] };
    const creatorMap = new Map((creators || []).map((creator) => [creator.id, creator.full_name]));
    return { success: true, data: (data || []).map((lead) => ({ ...lead, creator_name: creatorMap.get(lead.created_by) || "Admin / lama" })) };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// Tipe payload diubah menjadi any agar bisa menerima kolom baru seperti event_type, event_date, dll.
export async function createLeadAction(payload: any) {
  try {
    const { user } = await getCurrentUser();
    const phone = normalizePhone(payload?.client_phone);
    if (!payload?.client_name || !phone) return { success: false, error: "Nama dan nomor HP wajib diisi." };

    const { data: existingLeads, error: duplicateError } = await supabaseAdmin
      .from("leads")
      .select("id, client_name, client_phone, status, created_at, created_by")
      .not("client_phone", "is", null);
    if (duplicateError) throw duplicateError;
    const duplicate = (existingLeads || []).find((lead) => normalizePhone(lead.client_phone) === phone);
    if (duplicate) {
      return { success: false, error: "Nomor HP sudah digunakan oleh calon klien berikut.", duplicate };
    }
    const { data: existingBookings, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, client_name, client_phone, status, created_at, invoice_number")
      .not("client_phone", "is", null);
    if (bookingError) throw bookingError;
    const duplicateBooking = (existingBookings || []).find((booking) => normalizePhone(booking.client_phone) === phone);
    if (duplicateBooking) {
      return { success: false, error: "Nomor HP sudah digunakan pada pesanan berikut.", duplicate: duplicateBooking };
    }

    const { error } = await supabaseAdmin.from("leads").insert([{ ...payload, client_phone: phone, created_by: user.id }]);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// Tipe payload juga diubah menjadi any untuk proses update
export async function updateLeadAction(id: string, payload: any) {
  try {
    const { user, role } = await getCurrentUser();
    const { data: existing, error: existingError } = await supabaseAdmin.from("leads").select("id, client_phone, created_by").eq("id", id).single();
    if (existingError || !existing) throw new Error("Data calon klien tidak ditemukan.");
    if (role === "sales" && existing.created_by !== user.id) throw new Error("Anda hanya dapat mengedit calon klien milik sendiri.");

    const phone = normalizePhone(payload?.client_phone);
    if (!payload?.client_name || !phone) return { success: false, error: "Nama dan nomor HP wajib diisi." };
    const { data: candidates, error: duplicateError } = await supabaseAdmin
      .from("leads")
      .select("id, client_name, client_phone, status, created_at, created_by")
      .neq("id", id)
      .not("client_phone", "is", null);
    if (duplicateError) throw duplicateError;
    const duplicate = (candidates || []).find((lead) => normalizePhone(lead.client_phone) === phone);
    if (duplicate) return { success: false, error: "Nomor HP sudah digunakan oleh calon klien berikut.", duplicate };
    const { data: existingBookings, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, client_name, client_phone, status, created_at, invoice_number")
      .not("client_phone", "is", null);
    if (bookingError) throw bookingError;
    const duplicateBooking = (existingBookings || []).find((booking) => normalizePhone(booking.client_phone) === phone);
    if (duplicateBooking) return { success: false, error: "Nomor HP sudah digunakan pada pesanan berikut.", duplicate: duplicateBooking };

    const { error } = await supabaseAdmin.from("leads").update({ ...payload, client_phone: phone }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateLeadStatusAction(id: string, status: "pending" | "booked" | "cancelled", cancel_reason: string = "") {
  try {
    const { user, role } = await getCurrentUser();
    if (role === "sales") {
      const { data: lead } = await supabaseAdmin.from("leads").select("created_by").eq("id", id).single();
      if (!lead || lead.created_by !== user.id) throw new Error("Anda hanya dapat mengubah follow-up calon klien milik sendiri.");
    }
    const { error } = await supabaseAdmin.from("leads").update({ status, cancel_reason }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteLeadAction(id: string) {
  try {
    const { user, role } = await getCurrentUser();
    if (role === "sales") {
      const { data: lead } = await supabaseAdmin.from("leads").select("created_by").eq("id", id).single();
      if (!lead || lead.created_by !== user.id) throw new Error("Anda hanya dapat menghapus calon klien milik sendiri.");
    }
    const { error } = await supabaseAdmin.from("leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}