// file: app/actions/authActions.ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function verifyAndOverrideDeviceAction(email: string, password: string) {
  // PERBAIKAN: Tambahkan 'await' di sini karena Next.js terbaru mewajibkannya
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
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

  // 1. Verifikasi Password (sekaligus proses login)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error || !data.user) {
    return { success: false, error: "Email atau Password salah. Tidak dapat memindahkan perangkat." };
  }

  // 2. Buat ID Perangkat Baru (Karena password terbukti benar)
  const newDeviceId = crypto.randomUUID();

  // 3. Timpa ID Perangkat Lama di Database Supabase
  const { error: updateError } = await supabase.auth.updateUser({
    data: { bound_device_id: newDeviceId }
  });

  if (updateError) {
    return { success: false, error: "Gagal mengupdate kaitan perangkat di database." };
  }

  // 4. Tanamkan Cookie Device ID baru ke browser pengguna saat ini
  cookieStore.set("maeng_device_id", newDeviceId, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 // Aktif 1 Tahun
  });

  const role = data.user.user_metadata?.role || "client";
  return { success: true, role };
}