import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keep in sync with lib/client-id.ts
const CLIENT_ID_COOKIE = "tee_client";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Admin pages: refresh the Supabase login session cookies.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) => {
            list.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );
    await supabase.auth.getUser();
  }

  // Every browser gets an anonymous id. Designs are tied to it so only the
  // browser that made a design can change or buy it (and, in Phase 2, to count free try-ons).
  if (!request.cookies.get(CLIENT_ID_COOKIE)) {
    response.cookies.set(CLIENT_ID_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|mockups/|api/webhooks|favicon.ico).*)"],
};
