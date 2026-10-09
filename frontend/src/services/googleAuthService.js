import { getEnv } from '../utils/env';
import googleConfig from '../config/google.json';

/**
 * Service to handle Google Sign-In with Firebase Auth
 * Automatically checks:
 * 1. src/config/google.json (if user pasted Firebase config there)
 * 2. .env / .env.local (NEXT_PUBLIC_FIREBASE_*)
 */

const DEMO_API_KEY = 'AIzaSyDemoWhatsAppWebCloneApiKey123';

export function getResolvedFirebaseConfig() {
  // Check google.json first
  if (
    googleConfig &&
    googleConfig.apiKey &&
    !googleConfig.apiKey.includes('PASTE_YOUR') &&
    !googleConfig.apiKey.includes('Demo')
  ) {
    return googleConfig;
  }

  // Check Environment variables
  const apiKey = getEnv('NEXT_PUBLIC_FIREBASE_API_KEY') || getEnv('VITE_FIREBASE_API_KEY');
  const projectId = getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || getEnv('VITE_FIREBASE_PROJECT_ID', 'whatsapp-clone');

  if (apiKey && apiKey !== DEMO_API_KEY && !apiKey.includes('Demo')) {
    return {
      apiKey,
      authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') || getEnv('VITE_FIREBASE_AUTH_DOMAIN', `${projectId}.firebaseapp.com`),
      projectId,
      storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') || getEnv('VITE_FIREBASE_STORAGE_BUCKET', `${projectId}.appspot.com`),
      messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456789012'),
      appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID') || getEnv('VITE_FIREBASE_APP_ID', '1:123456789012:web:demo1234567890')
    };
  }

  return null;
}

export function isFirebaseConfigured() {
  return Boolean(getResolvedFirebaseConfig());
}

export async function signInWithGoogleFirebase() {
  const firebaseConfig = getResolvedFirebaseConfig();

  if (!firebaseConfig) {
    throw new Error('FIREBASE_CONFIG_REQUIRED');
  }

  const { initializeApp, getApps } = await import('firebase/app');
  const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  
  // Forces Google account chooser to show all logged in Google accounts on device
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  return {
    email: user.email,
    name: user.displayName || user.email.split('@')[0],
    avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.displayName || 'user')}`,
    googleId: user.uid,
    provider: 'firebase-google'
  };
}
