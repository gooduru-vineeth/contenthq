import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/", "/login", "/register"];

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // Allow public routes without authentication
  if (isPublicRoute && !isAuthPage) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login (except public/auth pages)
  if (!sessionCookie && !isAuthPage && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
