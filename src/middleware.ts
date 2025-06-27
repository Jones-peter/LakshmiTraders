
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'firebaseAuthToken'; // Example, actual token might be handled by Firebase SDK state

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // This is a simplified check. In a real Firebase app,
  // you'd verify the token server-side or rely on client-side auth state management.
  // For middleware, a common pattern is to check for a custom auth cookie set upon login.
  // Or, more simply, redirect to login if not on login page and no session detected (client-side handles session).
  // For this example, we assume client-side will handle redirects after checking auth state,
  // but middleware can enforce some basic rules.

  const isAuthenticated = request.cookies.has(AUTH_COOKIE_NAME); // Placeholder for actual auth check

  const protectedRoutes = ['/dashboard', '/batches', '/customers', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !isAuthenticated && pathname !== '/login') {
    // For this example, we'll assume client-side redirects are primary.
    // If we wanted to force redirect from middleware:
    // return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
