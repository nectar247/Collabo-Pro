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
    // Get security settings
    const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
    const securitySettings = settingsDoc.data()?.security || {
      maxLoginAttempts: 5,
      sessionTimeout: 30
    };

    // Proceed with sign in if user is active or doesn't exist yet
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    
    // Check status again after sign in (in case user was found after sign in)
    const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
    if (profileDoc.exists() && profileDoc.data()?.status === 'inactive') {
      // Sign out the user if they're inactive
      await firebaseSignOut(auth);
      throw new Error('Your account has been deactivated. Please contact support.');
    }

    if (profileDoc.exists()) {
      const profile = profileDoc.data();

      // Check if account is locked
      if (profile?.lockedUntil && new Date(profile?.lockedUntil) > new Date()) {
        const remainingTime = Math.ceil(
          (new Date(profile.lockedUntil).getTime() - new Date().getTime()) / 1000 / 60
        );
        throw new Error(`Account is locked. Try again in ${remainingTime} minutes.`);
      }

      // Check if account is inactive
      if (profile.status === 'inactive') {
        throw new Error('Your account has been deactivated. Please contact support.');
      }
    }

    // Update last login timestamp
    await setDoc(doc(db, 'profiles', user.uid), {
      loginAttempts: 0,
      lastLoginAttempt: null,
      lockedUntil: null,
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    }, { merge: true });

    return { user };
  } catch (error: any) {
    // Handle failed login attempt
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      const userDoc = doc(db, 'profiles', auth.currentUser?.uid || '');
      const profile = await getDoc(userDoc);

      if (profile.exists()) {
        const currentAttempts = (profile.data().loginAttempts || 0) + 1;
        const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
        const maxAttempts = settingsDoc.data()?.security?.maxLoginAttempts || 5;

        // Update login attempts
        await setDoc(userDoc, {
          loginAttempts: currentAttempts,
          lastLoginAttempt: serverTimestamp(),
          lockedUntil: currentAttempts >= maxAttempts 
            ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
            : null,
          updatedAt: serverTimestamp()
        }, { merge: true });

        if (currentAttempts >= maxAttempts) {
          throw new Error('Account locked due to too many failed attempts. Try again in 30 minutes.');
        }

        const remainingAttempts = maxAttempts - currentAttempts;
        throw new Error(`Invalid credentials. ${remainingAttempts} attempts remaining.`);
      }
    }
    // Handle specific error for inactive users
    if (error.message.includes('deactivated')) {
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