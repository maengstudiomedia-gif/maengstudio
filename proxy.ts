import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { Redis } from "@upstash/redis";

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

  const isProtectedUI =
    request.nextUrl.pathname.startsWith("/(Dashboard)") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/client");
  const isProtectedAPI = request.nextUrl.pathname.startsWith("/api/protected");

  if (isProtectedUI || isProtectedAPI) {
    if (!user || error) {
      if (isProtectedAPI) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const isLocked = await redis.get(`lockout:user:${user.email}`);
    if (isLocked) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=account_locked", request.url));
    }

    const boundDeviceId = user.user_metadata?.bound_device_id;
    const currentDeviceId = request.cookies.get("maeng_device_id")?.value;
    if (boundDeviceId && boundDeviceId !== currentDeviceId) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=device_mismatch", request.url));
    }

    const lastSignInAt = new Date(user.last_sign_in_at || "").getTime();
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (now - lastSignInAt > FIVE_MINUTES) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=session_timeout", request.url));
    }

    const role = user.user_metadata?.role || "client";
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
