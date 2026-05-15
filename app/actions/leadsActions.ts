"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin, getErrorMessage } from "./adminBookings/utils"; // Sesuaikan path utils Anda

// Fungsi getLeadsAction sudah diperbarui untuk melakukan JOIN ke tabel packages
export async function getLeadsAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select(`
        *,
        packages:interested_package_id (
          name,
          price
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// Tipe payload diubah menjadi any agar bisa menerima kolom baru seperti event_type, event_date, dll.
export async function createLeadAction(payload: any) {
  try {
    const { error } = await supabaseAdmin.from("leads").insert([payload]);
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
    const { error } = await supabaseAdmin.from("leads").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateLeadStatusAction(id: string, status: "pending" | "booked" | "cancelled", cancel_reason: string = "") {
  try {
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
    const { error } = await supabaseAdmin.from("leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}