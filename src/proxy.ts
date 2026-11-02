import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  const login = request.nextUrl.pathname === "/admin/login";
  if (config) {
    const db = createServerClient(config.url, config.key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    } });
    const { data: { user }, error } = await db.auth.getUser();
    if ((!user || error) && !login) {
      const destination = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.getAll().forEach(cookie => destination.cookies.set(cookie));
      destination.headers.set("Cache-Control", "private, no-store");
      return destination;
    }
  } else if (!login) {
    response = NextResponse.redirect(new URL("/admin/login", request.url));
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/admin/:path*"] };
