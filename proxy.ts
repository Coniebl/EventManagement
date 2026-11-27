import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/staff/login") {
    return NextResponse.next();
  }

  // Redirect unauthenticated staff requests to login (server verifies session)
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
