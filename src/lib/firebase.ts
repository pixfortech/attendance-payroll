/* ============================================================
   Firebase initialisation.

   Config comes from VITE_FIREBASE_* env vars (the web config is public client
   config, not a secret — but it is NOT committed; see .env.example). When the
   env is absent the app runs in DEMO mode: Auth/Firestore are disabled and the
   suite falls back to local seed data + localStorage.
   ============================================================ */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when the minimum Firebase config is present. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

/** Master Admin UID (informational on the client; the real gate is Firestore rules). */
export const masterAdminUid = import.meta.env.VITE_MASTER_ADMIN_UID;

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (firebaseConfigured) {
  app = initializeApp(config as Record<string, string>);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

export const auth = authInstance;
export const db = dbInstance;
