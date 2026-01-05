"use client";

import AuthCookieSync from './AuthCookieSync';

/**
 * ClientProviders - Wraps all client-side components
 * This allows the parent layout to remain a Server Component
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthCookieSync />
      {children}
    </>
  );
}
