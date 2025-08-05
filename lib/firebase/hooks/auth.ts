/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Profile } from '../collections';
import { signOut } from '../../auth';

// Authentication hook
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
      // Clean up previous profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
      
      if (user) {
        // Set up real-time listener for profile changes
        profileUnsubscribe = onSnapshot(
          doc(db, 'profiles', user.uid),
          async (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              // Check if user is inactive
              if (data.status === 'inactive') {
                try {
                  await signOut();
                  setUser(null);
                  setIsAdmin(false);
                  setError(new Error('Your account has been deactivated. Please contact support.'));
                } catch (err) {
                  console.error('Error signing out inactive user:', err);
                }
              } else {
                setUser(user);
                setIsAdmin(data.isAdmin || false);
                setError(null);
              }
            } else {
              setUser(user);
              setIsAdmin(false);
              setError(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching profile:', error);
            setIsAdmin(false);
            setLoading(false);
            setError(error as Error);
          }
        );
      } else {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  return { user, isAdmin, loading, error };
}

// Profile hook
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedDeals, setSavedDeals] = useState<[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'profiles', user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as Profile;
          setProfile(data);
          setSavedDeals(data.savedDeals || []);
        } else {
          setProfile(null);
          setSavedDeals([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching profile:', error);
        setError(error as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  // Save/unsave deals function
  const savedUnsaveDeals = async (payload: { dealId: string }, shouldSave: boolean) => {
    if (!user || !profile) return false;

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const currentSavedDeals = profile.savedDeals || [];
      
      let updatedSavedDeals;
      if (shouldSave) {
        updatedSavedDeals = [...currentSavedDeals, { dealId: payload.dealId, savedAt: new Date() }];
      } else {
        updatedSavedDeals = currentSavedDeals.filter((deal: any) => deal.dealId !== payload.dealId);
      }
      
      await updateDoc(profileRef, {
        savedDeals: updatedSavedDeals
      });
      
      return shouldSave;
    } catch (error) {
      console.error('Error saving/unsaving deal:', error);
      throw error;
    }
  };

  return { profile, savedDeals, savedUnsaveDeals, loading, error };
}