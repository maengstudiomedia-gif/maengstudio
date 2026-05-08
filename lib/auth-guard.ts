import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type AuthGuardResult = 
  | { success: true; user: any; message: string }
  | { success: false; user: null; message: string; statusCode: number; redirectUrl?: string };

export async function verifySecureSession(): Promise<AuthGuardResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch (error) {
            // Abaikan error setAll jika dipanggil dari Server Component
          }
        },
      },
    }
  );

  // --- 1. VERIFIKASI JWT KE SERVER SUPABASE ---
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    return { success: false, user: null, message: "Unauthorized: Invalid or expired session", statusCode: 401, redirectUrl: "/login" };
  }

  // --- 2. GLOBAL LOCKOUT CHECK (REDIS) ---
  const isLocked = await redis.get(`lockout:user:${user.email}`);
  if (isLocked) {
    // 💡 Fix Poin 3: Revoke paksa session jika terdeteksi abuse
    await supabase.auth.signOut(); 
    return { success: false, user: null, message: "Forbidden: Account temporarily locked", statusCode: 403, redirectUrl: "/login?error=account_locked" };
  }

  // --- 3. SESSION BINDING / HIJACK CHECK ---
  const boundDeviceId = user.user_metadata?.bound_device_id;
  const currentDeviceId = cookieStore.get("maeng_device_id")?.value;
  
  if (boundDeviceId && boundDeviceId !== currentDeviceId) {
    // 💡 Fix Poin 3: Revoke paksa session jika device tidak cocok
    await supabase.auth.signOut();
    return { success: false, user: null, message: "Forbidden: Session hijacking detected", statusCode: 403, redirectUrl: "/login?error=device_mismatch" };
  }

  // Jika lolos semua lubang jarum
  return { success: true, user, message: "Session is secure and valid" };
}