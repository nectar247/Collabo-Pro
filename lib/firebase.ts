import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db =
  typeof window !== 'undefined'
    ? initializeFirestore(app, {
        localCache: persistentLocalCache(),
        experimentalForceLongPolling: false, // Use WebChannel for better performance
        experimentalAutoDetectLongPolling: true, // Auto-detect network conditions
      })
    : getFirestore(app); // fallback for SSR (no IndexedDB)

const storage = getStorage(app);

// Direct auth initialization - removed Proxy pattern that was causing issues in Next.js 15
// The Proxy pattern broke method binding for onAuthStateChanged and other Firebase Auth methods
const auth = typeof window !== 'undefined' ? getAuth(app) : ({} as ReturnType<typeof getAuth>);

export { app, db, storage, auth };