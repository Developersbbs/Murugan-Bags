import { NextRequest, NextResponse } from "next/server";

/**
 * Decode JWT token without verification (for expiry check only)
 */
function decodeToken(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

export async function middleware(req: NextRequest) {
  const authRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/update-password",
  ];

  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname);

  // Check if user has auth token in cookie
  const token = req.cookies.get('authToken')?.value;

  // Validate token (check if exists and not expired)
  const isLoggedIn = !!token && !isTokenExpired(token);

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If user is not logged in and trying to access protected routes, redirect to login
  if (!isLoggedIn && !isAuthRoute) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect_to", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth|.*\\..*).*)"],
};
