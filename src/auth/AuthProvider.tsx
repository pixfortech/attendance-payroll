import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, type User } from 'firebase/auth';
import { auth, firebaseConfigured, masterAdminUid } from '../lib/firebase';

interface AuthContextValue {
  /** Whether Firebase is configured (else the app runs in demo mode). */
  configured: boolean;
  user: User | null;
  loading: boolean;
  /** Admin access is granted when Firebase is unconfigured (demo) or a user is signed in. */
  adminAuthed: boolean;
  masterAdminUid?: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value: AuthContextValue = {
    configured: firebaseConfigured,
    user,
    loading,
    adminAuthed: !firebaseConfigured || !!user,
    masterAdminUid,
    signIn: async (email, password) => {
      if (!auth) throw new Error('Firebase Auth is not configured.');
      await signInWithEmailAndPassword(auth, email, password);
    },
    signOut: async () => {
      if (auth) await fbSignOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
