"use client";

import { useEffect } from 'react';
import { useAuth } from '@/lib/firebase/hooks';

/**
 * AuthCookieSync - Keeps auth cookie in sync with Firebase auth state
 * This ensures middleware can check authentication status
 */
export default function AuthCookieSync() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const syncAuthCookie = async () => {
      if (loading) return;

      if (user) {
        try {
          // Get fresh Firebase token
          const token = await user.getIdToken(true);

          // Set/update auth cookie (24 hour expiry)
          document.cookie = `authToken=${token}; path=/; max-age=86400; secure; samesite=lax`;
        } catch (error) {
          console.error('Error syncing auth cookie:', error);
          // Clear cookie on error
          document.cookie = 'authToken=; path=/; max-age=0';
        }
      } else {
        // Clear cookie when user is signed out
        document.cookie = 'authToken=; path=/; max-age=0';
      }
    };

    syncAuthCookie();

    // Refresh token every 50 minutes (Firebase tokens expire after 1 hour)
    const interval = setInterval(() => {
      if (user) {
        syncAuthCookie();
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, loading]);

  return null; // This component doesn't render anything
}
