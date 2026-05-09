"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr"; // <--- WAJIB UNTUK MENGATASI BUG REDIRECT
import { headers, cookies } from "next/headers";
import crypto from "crypto";
import { Redis } from "@upstash/redis";

// ==========================================
// INISIALISASI KLIEN
// ==========================================
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Admin bypass client untuk logging dan manajemen sesi
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Penyamar Waktu Respons
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function equalizeTiming(startTime: number) {
  const elapsed = Date.now() - startTime;
  const targetTime = 600 + Math.floor(Math.random() * 200);
  if (elapsed < targetTime) {
    await delay(targetTime - elapsed);
  }
}

// Helper: Deteksi IP Terpercaya
async function getTrustedIp() {
  const headersList = await headers();
  return (
    headersList.get("x-real-ip") || 
    headersList.get("cf-connecting-ip") || 
    "127.0.0.1" 
  );
}

function getSafeCookieDomain(rawDomain: string | undefined, requestHost: string | null): string | undefined {
  if (!rawDomain || !requestHost) return undefined;

  // Normalize domain from env (strip protocol, path, and port).
  const normalizedDomain = rawDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .replace(/^\.+/, "");

  const normalizedHost = requestHost
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/^\.+/, "");

  if (!normalizedDomain || !normalizedHost) return undefined;

  // Host-only cookie fallback for local and raw IP environments.
  if (normalizedDomain === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedDomain)) {
    return undefined;
  }

  // Only allow setting Domain if it matches current host/superdomain.
  if (normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`)) {
    return normalizedDomain;
  }

  return undefined;
}

// ============================================================================
// ACTION 1 & 2: CEK STATUS
// ============================================================================
export async function checkIpStatusAction() {
  const ip = await getTrustedIp();
  const ipKey = `rate_limit:ip:${ip}`;
  const ipFails = await redis.get<number>(ipKey) || 0;

  if (ipFails >= 10) {
    const ttl = await redis.ttl(ipKey);
    return { isLocked: true, lockoutTime: ttl > 0 ? ttl : 0 };
  }
  return { isLocked: false };
}

export async function checkEmailStatusAction(rawEmail: string) {
  const email = rawEmail.toLowerCase().trim();
  const emailKey = `rate_limit:email:${email}`;
  const emailFails = await redis.get<number>(emailKey) || 0;

  if (emailFails >= 10) {
    const ttl = await redis.ttl(emailKey);
    return { isLocked: true, lockoutTime: ttl > 0 ? ttl : 0 };
  }
  const attemptsLeft = 10 - emailFails;
  return { isLocked: false, attemptsLeft: attemptsLeft >= 0 ? attemptsLeft : 0 };
}

// ============================================================================
// ACTION 3: SECURE LOGIN UTAMA (FINAL VERSION DENGAN SSR COOKIE)
// ============================================================================
export async function secureLoginAction(formData: FormData) {
  const startTime = Date.now();

  const ip = await getTrustedIp();
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "unknown";
  const requestHost = headersList.get("x-forwarded-host") || headersList.get("host");

  // --- 0. ANTI DOUBLE-SUBMIT (DEBOUNCE) ---
  const debounceKey = `debounce:login:${ip}`;
  const isSpam = await redis.setnx(debounceKey, "1");
  if (isSpam === 0) {
    return { success: false, message: "Sistem sedang memproses. Tunggu sebentar." };
  }
  await redis.expire(debounceKey, 2);

  // --- 1. EXPLICIT CSRF PROTECTION ---
  const origin = headersList.get("origin");
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (origin && expectedOrigin && !origin.includes(expectedOrigin) && process.env.NODE_ENV === "production") {
    await equalizeTiming(startTime);
    return { success: false, message: "Permintaan ditolak: Keamanan CSRF." };
  }

  // --- 2. BACKEND VALIDATION ---
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const turnstileToken = formData.get("cf-turnstile-response") as string;

  if (!rawEmail || typeof rawEmail !== "string" || rawEmail.length > 255) {
    await equalizeTiming(startTime);
    return { success: false, message: "Email atau Sandi salah." };
  }
  if (!rawPassword || typeof rawPassword !== "string" || rawPassword.length < 6 || rawPassword.length > 100) {
    await equalizeTiming(startTime);
    return { success: false, message: "Email atau Sandi salah." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(rawEmail)) {
    await equalizeTiming(startTime);
    return { success: false, message: "Email atau Sandi salah." };
  }

  const email = rawEmail.toLowerCase().trim();
  const password = rawPassword;

  // --- 3. CAPTCHA & REPLAY PROTECTION ---
  if (!turnstileToken) {
    await equalizeTiming(startTime);
    return { success: false, message: "Verifikasi keamanan gagal." };
  }
  
  const tokenHash = crypto.createHash('sha256').update(turnstileToken).digest('hex');
  const turnstileKey = `turnstile_used:${tokenHash}`;
  
  const isTokenFresh = await redis.setnx(turnstileKey, "1"); 
  if (isTokenFresh === 0) {
    await equalizeTiming(startTime);
    return { success: false, message: "Sesi keamanan tidak valid atau sudah digunakan." };
  }
  await redis.expire(turnstileKey, 300);

  // --- 4. ATOMIC PRE-CHECK VIA LUA SCRIPT ---
  const currentSecond = Math.floor(Date.now() / 1000);
  const globalBucketKey = `rate_limit:global:${currentSecond}`;
  const ipKey = `rate_limit:ip:${ip}`;
  const emailKey = `rate_limit:email:${email}`;

  const luaScript = `
    local globalReqs = redis.call('INCR', KEYS[1])
    if globalReqs == 1 then redis.call('EXPIRE', KEYS[1], 10) end
    
    local ipFails = tonumber(redis.call('GET', KEYS[2]) or '0')
    local emailFails = tonumber(redis.call('GET', KEYS[3]) or '0')
    
    if globalReqs > 50 or ipFails >= 10 or emailFails >= 10 then
      return { globalReqs, ipFails, emailFails, 1 } 
    end
    return { globalReqs, ipFails, emailFails, 0 } 
  `;

  const preCheckResults = await redis.eval(luaScript, [globalBucketKey, ipKey, emailKey], []) as number[];
  const currentIpFails = preCheckResults[1];
  const currentEmailFails = preCheckResults[2];
  const isBlockedByRedis = preCheckResults[3] === 1;

  if (isBlockedByRedis || currentIpFails >= 10 || currentEmailFails >= 10) {
    await equalizeTiming(startTime);
    return { success: false, isLocked: true, lockoutTime: 1800, message: "Terkunci 30 menit." };
  }

  // ====================================================================
  // 5. EKSEKUSI LOGIN MENGGUNAKAN SSR (KUNCI AGAR REDIRECT BERHASIL)
  // ====================================================================
  const cookieStore = await cookies();
  
  const supabaseSSR = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch (error) {
            // Error ini diabaikan karena kita berada di dalam Server Action
          }
        },
      },
    }
  );

  const { data: authData, error: authError } = await supabaseSSR.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    // --- 6. ATOMIC FAILURE INCREMENT ---
    const pFail = redis.multi();
    pFail.incr(ipKey);
    pFail.expire(ipKey, 1800);
    pFail.incr(emailKey);
    pFail.expire(emailKey, 1800);
    const failResults = await pFail.exec();
    
    const newIpFails = failResults[0] as number;
    const newEmailFails = failResults[2] as number;

    supabaseAdmin.from("login_logs").insert([{ 
      email, status: "failed", ip_address: ip, user_agent: userAgent,
      pattern: newIpFails > 5 && newEmailFails === 1 ? "credential_stuffing" : newEmailFails > 5 ? "brute_force" : "normal"
    }]).then();

    await equalizeTiming(startTime);
    const attemptsLeft = Math.max(0, 10 - newEmailFails);
    return { success: false, isLocked: false, attemptsLeft, message: `Email atau Sandi salah.` };

  } else {
    // --- 7. LOGIN BERHASIL ---
    await Promise.all([redis.del(ipKey), redis.del(emailKey)]);

    // Generate dan Set Device ID yang baru
    const secureDeviceId = crypto.randomBytes(32).toString('hex');
    const cookieDomain = getSafeCookieDomain(process.env.NEXT_PUBLIC_APP_DOMAIN, requestHost);

    cookieStore.set({
      name: "maeng_device_id", value: secureDeviceId, httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", domain: cookieDomain, maxAge: 60 * 60 * 24 * 365,
    });

    // --- SOLUSI DEFINITIF: AMBIL ROLE PAKAI supabaseAdmin TERLEBIH DAHULU ---
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error("Gagal mengambil role admin:", profileError.message);
    } else {
      console.log("Data profil berhasil diambil:", profileData);
    }

    const finalRole = profileData?.role || 'client';

    // --- SINKRONISASI KE METADATA (TERMASUK ROLE) ---
    // Simpan Device ID DAN Role ke Meta Data agar Middleware bisa membacanya tanpa panggil database
    await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      user_metadata: { 
        bound_device_id: secureDeviceId,
        role: finalRole 
      }
    });

    supabaseAdmin.from("login_logs").insert([{ 
      email, status: "success", ip_address: ip, device_id: secureDeviceId, pattern: "normal_login"
    }]).then();

    return { 
      success: true, 
      role: finalRole 
    };
  }
}