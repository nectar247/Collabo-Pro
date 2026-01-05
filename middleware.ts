// middleware.ts
import { NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/:path*/settings/:path*',
    '/:path*/settings',
    '/((?!api|_next/static|favicon.ico).*)'
  ],
}

export function middleware() {
  // Dashboard and admin pages handle their own client-side authentication
  // Middleware protection is disabled to avoid cookie sync issues
  // The pages check for authenticated users and show appropriate UI/redirects

  return NextResponse.next();
}
