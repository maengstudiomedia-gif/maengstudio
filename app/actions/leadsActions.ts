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

// Fungsi getLeadsAction sudah diperbarui untuk melakukan JOIN ke tabel packages
export async function getLeadsAction() {
  try {
    await getCurrentUser();
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
    const { error } = await supabaseAdmin.from("leads").insert([{ ...payload, created_by: user.id }]);
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
    await getCurrentUser();
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
    await getCurrentUser();
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
    await getCurrentUser();
    const { error } = await supabaseAdmin.from("leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}