"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export type ManagedRole = "admin" | "sales" | "customer";

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi tidak valid.");
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Akses admin diperlukan.");
  return user;
}

export async function getManagedUsersAction() {
  try {
    await requireAdmin();
    const [{ data: authData, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("profiles").select("id, full_name, phone, role"),
    ]);
    if (authError) throw authError;
    if (profileError) throw profileError;
    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
    return {
      success: true,
      data: (authData.users || []).map((user) => ({
        id: user.id,
        email: user.email || "-",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        ...(profileMap.get(user.id) || {}),
        full_name: profileMap.get(user.id)?.full_name || user.user_metadata?.full_name || "-",
        role: profileMap.get(user.id)?.role || user.user_metadata?.role || "customer",
      })),
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal memuat akun.", data: [] };
  }
}

export async function updateUserRoleAction(userId: string, role: ManagedRole) {
  try {
    const admin = await requireAdmin();
    if (!userId || !["admin", "sales", "customer"].includes(role)) return { success: false, error: "Data role tidak valid." };
    if (admin.id === userId && role !== "admin") return { success: false, error: "Akun admin yang sedang aktif tidak dapat diturunkan perannya." };
    const { error: profileError } = await supabaseAdmin.from("profiles").update({ role }).eq("id", userId);
    if (profileError) throw profileError;
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { role } });
    if (authError) throw authError;
    revalidatePath("/admin/accounts");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal mengubah role." };
  }
}