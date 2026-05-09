import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Redis } from "@upstash/redis";
import { deviceBindGraceKey, maengDeviceIdCookieAttrs } from "@/lib/maeng-device-cookie";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  let authUser = user;
  let authError = error;

  // Fallback untuk edge/runtime tertentu: jika verifikasi user gagal
  // tetapi cookie sesi Supabase ada, coba baca sesi dari cookie.
  if (!authUser || authError) {
    const hasSupabaseSessionCookie = request.cookies.getAll().some((c) => {
      const n = c.name;
      return (
        n.startsWith("sb-") &&
        (n.includes("auth-token") || n.includes("refresh-token"))
      );
    });

    if (hasSupabaseSessionCookie) {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (session?.user) {
        authUser = session.user;
        authError = sessionError ?? null;
      }
    }
  }

  const isProtectedUI =
    request.nextUrl.pathname.startsWith("/(Dashboard)") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/client");
  const isProtectedAPI = request.nextUrl.pathname.startsWith("/api/protected");

  if (isProtectedUI || isProtectedAPI) {
    if (!authUser || authError) {
      if (isProtectedAPI) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }

    const isLocked = await redis.get(`lockout:user:${authUser.email}`);
    if (isLocked) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=account_locked", request.url));
    }

    const boundDeviceId = authUser.user_metadata?.bound_device_id as string | undefined;
    const currentDeviceId = request.cookies.get("maeng_device_id")?.value;
    const requestHostHdr =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host") ||
      null;

    if (boundDeviceId && boundDeviceId !== currentDeviceId) {
      const grace = await redis.get<string>(deviceBindGraceKey(authUser.id));

      const canHealGrace = grace === boundDeviceId && typeof boundDeviceId === "string";

      if (canHealGrace) {
        response.cookies.set("maeng_device_id", boundDeviceId, maengDeviceIdCookieAttrs(requestHostHdr));
        await redis.del(deviceBindGraceKey(authUser.id));
      } else {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=device_mismatch", request.url));
      }
    }
    // Jangan gunakan last_sign_in_at sebagai timeout request-by-request;
    // nilai ini tidak berubah di setiap request dan bisa memicu logout palsu.
    // Validitas sesi tetap dijaga oleh Supabase JWT + refresh token.
    let role = authUser.user_metadata?.role as string | undefined;
    if (!role) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();
      role = profileData?.role || "client";
    }

    const path = request.nextUrl.pathname;

    if (path.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/client/profile", request.url));
    }

    if (path.startsWith("/client") && role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
