"use client";

import AuthCookieSync from './AuthCookieSync';
import { AuthProvider } from './AuthProvider';
import { CacheProvider } from './CacheProvider';

/**
 * ClientProviders - Wraps all client-side components
 * This allows the parent layout to remain a Server Component
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CacheProvider>
        <AuthCookieSync />
        {children}
      </CacheProvider>
    </AuthProvider>
  );
}
