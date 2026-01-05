"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut as firebaseSignOut } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('🔐 AuthProvider: Setting up single auth listener');
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('🔐 AuthProvider: Auth state changed', user ? `User: ${user.uid}` : 'No user');

      // Clean up previous profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (user) {
        console.log('🔐 AuthProvider: Setting up profile listener for', user.uid);
        // Set up real-time listener for profile changes
        profileUnsubscribe = onSnapshot(
          doc(db, 'profiles', user.uid),
          async (doc) => {
            console.log('🔐 AuthProvider: Profile snapshot received', doc.exists() ? 'exists' : 'not exists');
            if (doc.exists()) {
              const data = doc.data();
              console.log('🔐 AuthProvider: Profile data:', { status: data.status, isAdmin: data.isAdmin });
              // Check if user is inactive
              if (data.status === 'inactive') {
                console.log('🔐 AuthProvider: User is inactive, signing out');
                try {
                  await firebaseSignOut();
                  setUser(null);
                  setIsAdmin(false);
                  setError(new Error('Your account has been deactivated. Please contact support.'));
                } catch (err) {
                  console.error('Error signing out inactive user:', err);
                }
              } else {
                console.log('🔐 AuthProvider: User is active, setting state');
                setUser(user);
                setIsAdmin(data.isAdmin || false);
                setError(null);
              }
            } else {
              console.log('🔐 AuthProvider: Profile does not exist');
              setUser(user);
              setIsAdmin(false);
              setError(null);
            }
            console.log('🔐 AuthProvider: Setting loading to false');
            setLoading(false);
          },
          (error) => {
            console.error('❌ AuthProvider: Error fetching profile:', error);
            setIsAdmin(false);
            setLoading(false);
            setError(error as Error);
          }
        );
      } else {
        console.log('🔐 AuthProvider: No user, setting loading to false');
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      console.log('🔐 AuthProvider: Cleaning up listeners');
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During SSR or if used outside provider, return safe defaults
    if (typeof window === 'undefined') {
      return { user: null, isAdmin: false, loading: true, error: null };
    }
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
