import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const authRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/update-password",
  ];

  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname);
  
  // Check if user has auth token in cookie (we'll set this when user logs in)
  const token = req.cookies.get('authToken')?.value;
  const isLoggedIn = !!token;

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
