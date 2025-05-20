import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define the protected paths
const PROTECTED_PATHS = ['/admin', '/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect defined paths
  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    const token = request.cookies.get('authToken')?.value;

    // Not authenticated? Redirect to sign-in
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      return NextResponse.redirect(url);
    }
  }

  // Allow request
  return NextResponse.next();
}
