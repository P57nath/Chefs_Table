import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath } from "@/features/auth/roles";
import { buildCsp, createNonce } from "@/lib/csp";

/**
 * Next 16 proxy (formerly middleware):
 * 1. Per-request CSP nonce: set on the request (Next applies it to its own
 *    scripts; the root layout passes it to our inline pre-paint scripts) and
 *    on the response.
 * 2. Refreshes the Supabase auth cookie on every request (official @supabase/ssr pattern).
 * 3. Sends signed-out (or anonymous guest) visitors of /staff, /kitchen, /admin to /login.
 * Role checks happen in each section's server layout; the database is the real guard.
 */
export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    dev: process.env.NODE_ENV === "development",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    https: (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https:"),
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };
  let response = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Forward the refreshed cookies to the render as well.
          requestHeaders.set("cookie", request.cookies.toString());
          response = next();
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // Verifies the JWT (signature + expiry) and refreshes the session if needed.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const signedInStaffCandidate = !!claims && claims.is_anonymous !== true;

  const { pathname, search } = request.nextUrl;
  if (isProtectedPath(pathname) && !signedInStaffCandidate) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, public files and API routes (payment callbacks never need auth cookies).
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest|js|html|json)$).*)",
  ],
};
