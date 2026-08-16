import { initializeApp, FirebaseOptions } from 'firebase/app';
import { getAuth, onAuthStateChanged, User, signInAnonymously as firebaseSignInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Initialize Firebase safely
let app: any = null;
let auth: any = null;
let db: any = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_firebase_api_key_here') {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('Firebase initialization warning:', e);
}

export { auth, db };

// Auth context interface
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: {
        uid: 'demo-user-123',
        isAnonymous: true,
        email: 'demo@prism.local',
        displayName: 'Demo User'
      } as any,
      loading: false,
      signInAnonymously: async () => {},
      signInWithGoogle: async () => {},
      signOut: async () => {},
      upgradeToPro: async () => {},
    };
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>({
    uid: 'demo-user-123',
    isAnonymous: true,
    email: 'demo@prism.local',
    displayName: 'Demo User'
  } as any);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (auth) {
      try {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
          }
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (e) {
        setLoading(false);
      }
    }
  }, []);

  const signInAnonymously = async () => {
    try {
      if (auth) {
        await firebaseSignInAnonymously(auth);
      } else {
        setUser({
          uid: 'demo-user-123',
          isAnonymous: true,
          email: 'demo@prism.local',
          displayName: 'Demo User'
        } as any);
      }
    } catch (error) {
      console.error('Error signing in anonymously:', error);
    }
  };

  const signInWithGoogle = async () => {
    await signInAnonymously();
  };

  const signOut = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const upgradeToPro = async () => {
    try {
      if (db && user?.uid) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { isPro: true });
      }
    } catch (error) {
      console.error('Error upgrading to Pro:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInAnonymously, signInWithGoogle, signOut, upgradeToPro }}>
      {children}
    </AuthContext.Provider>
  );
};

export const FirebaseAppProvider = AuthProvider;
