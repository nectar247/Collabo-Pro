// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/:path*/settings/:path*',
    '/:path*/settings'
  ],
}

export function middleware(request: NextRequest) {
  // Remove /admin from protected paths since we handle it in the page
  const PROTECTED_PATHS = ['/dashboard'];
  
  if (PROTECTED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }
  
  return NextResponse.next();
}
