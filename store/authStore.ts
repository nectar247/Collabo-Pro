import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { User } from '@/types';

interface AuthState {
  // State
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => () => void; // returns unsubscribe function
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<Pick<User, 'displayName' | 'bio' | 'photoURL'>>) => Promise<void>;
  clearError: () => void;
  _setUser: (user: User | null) => void;
  _setFirebaseUser: (user: FirebaseUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      firebaseUser: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      initialize: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // Fetch Firestore profile
            try {
              const userDoc = await getDoc(
                doc(db, COLLECTIONS.USERS, firebaseUser.uid)
              );
              const userData = userDoc.exists()
                ? ({ id: userDoc.id, ...userDoc.data() } as User)
                : null;

              set({
                firebaseUser,
                user: userData,
                isAuthenticated: true,
                isLoading: false,
              });
            } catch {
              set({
                firebaseUser,
                user: null,
                isAuthenticated: true,
                isLoading: false,
              });
            }
          } else {
            set({
              firebaseUser: null,
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        });
        return unsubscribe;
      },

      signIn: async (email, password) => {
        set({ error: null, isLoading: true });
        try {
          await signInWithEmailAndPassword(auth, email, password);
          // onAuthStateChanged will update state
        } catch (err: unknown) {
          const error = mapFirebaseAuthError(err);
          set({ error, isLoading: false });
          throw new Error(error);
        }
      },

      signUp: async (email, password, displayName) => {
        set({ error: null, isLoading: true });
        try {
          const { user: firebaseUser } = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

          // Update Firebase Auth display name
          await updateProfile(firebaseUser, { displayName });

          // Create Firestore user profile
          const userProfile: Omit<User, 'id'> = {
            displayName,
            email,
            status: 'online',
            workspaces: [],
            createdAt: serverTimestamp() as User['createdAt'],
          };

          await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), userProfile);
          // onAuthStateChanged will update state
        } catch (err: unknown) {
          const error = mapFirebaseAuthError(err);
          set({ error, isLoading: false });
          throw new Error(error);
        }
      },

      signOut: async () => {
        await firebaseSignOut(auth);
        set({ user: null, firebaseUser: null, isAuthenticated: false });
      },

      updateUserProfile: async (updates) => {
        const { user, firebaseUser } = get();
        if (!user || !firebaseUser) return;

        await updateDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), updates);
        set({ user: { ...user, ...updates } });
      },

      clearError: () => set({ error: null }),
      _setUser: (user) => set({ user }),
      _setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the user profile — firebaseUser is re-hydrated by Firebase SDK
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Map Firebase auth error codes to human-readable messages
function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'No account found with this email or password is incorrect.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
