import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the staff login page without a session
  if (pathname === "/staff/login") {
    return NextResponse.next();
  }

  // Optimistic check for staff routes: redirect to /staff/login if no session cookie
  // Full cryptographic verification + role check runs on the server in every page & API route.
  if (pathname.startsWith("/staff")) {
    const sessionCookie = request.cookies.get("staff_session")?.value;
    if (!sessionCookie) {
      const loginUrl = new URL("/staff/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*"],
};
