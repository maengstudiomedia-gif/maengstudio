import type { NextRequest } from "next/server";
import { proxy } from "./proxy";

/** Next.js middleware entry — `proxy.ts` holds the matcher & guard logic. */
export async function middleware(request: NextRequest) {
  return proxy(request);
}

export { config } from "./proxy";
