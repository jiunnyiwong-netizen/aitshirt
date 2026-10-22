import { NextResponse, type NextRequest } from "next/server";

// Keep in sync with lib/client-id.ts
const CLIENT_ID_COOKIE = "tee_client";

// Gives every browser an anonymous id. Designs are tied to it so only the
// browser that made a design can change it (and, in Phase 2, to count free try-ons).
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
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
  matcher: ["/((?!_next/static|_next/image|mockups/|favicon.ico).*)"],
};
