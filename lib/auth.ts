import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  loginAttempts: number;
  lastLoginAttempt: Date | null;
  lockedUntil: Date | null;
}

export async function signUp(email: string, password: string, name: string) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'profiles', user.uid), {
      id: user.uid,
      email: user.email,
      name,
      status: 'active', // Set initial status as active
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      emailVerified: user.emailVerified
    });

    // Send email verification
    await sendEmailVerification(user);

    return { user };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function signIn(email: string, password: string) {
  try {
    // Proceed with sign in
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    // Check profile status and update login in a single read
    const profileDoc = await getDoc(doc(db, 'profiles', user.uid));

    if (profileDoc.exists()) {
      const profile = profileDoc.data();

      // Check if account is locked
      if (profile?.lockedUntil && new Date(profile.lockedUntil.toDate?.() || profile.lockedUntil).getTime() > Date.now()) {
        await firebaseSignOut(auth);
        const remainingTime = Math.ceil(
          (new Date(profile.lockedUntil.toDate?.() || profile.lockedUntil).getTime() - Date.now()) / 1000 / 60
        );
        throw new Error(`Account is locked. Try again in ${remainingTime} minutes.`);
      }

      // Check if account is inactive
      if (profile.status === 'inactive') {
        await firebaseSignOut(auth);
        throw new Error('Your account has been deactivated. Please contact support.');
      }
    }

    // Update last login timestamp (non-blocking - fire and forget)
    setDoc(doc(db, 'profiles', user.uid), {
      loginAttempts: 0,
      lastLoginAttempt: null,
      lockedUntil: null,
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    }, { merge: true }).catch(err => console.error('Failed to update login timestamp:', err));

    return { user };
  } catch (error: any) {
    // Handle failed login attempt
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      // For failed attempts, we don't have a user.uid, so skip the attempt tracking
      throw new Error('Invalid email or password.');
    }
    // Handle specific error for inactive users
    if (error.message.includes('deactivated') || error.message.includes('locked')) {
      throw error;
    }
    throw new Error(error.message);
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Check if user is inactive whenever auth state changes
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      if (profileDoc.exists() && profileDoc.data()?.status === 'inactive') {
        // Sign out inactive users
        await firebaseSignOut(auth);
        callback(null);
        return;
      }
    }
    callback(user);
  });
}