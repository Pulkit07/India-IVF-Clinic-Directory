import { getApps, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

let databaseClient: Promise<ReturnType<typeof getFirestore>> | undefined;
let authenticatedClient: ReturnType<typeof initializeAuth> | undefined;

export function getFirebaseDb() {
  return databaseClient ??= initializeDatabase().catch(error => {
    databaseClient = undefined;
    throw error;
  });
}

export function getFirebase() {
  return authenticatedClient ??= initializeAuth().catch(error => {
    authenticatedClient = undefined;
    throw error;
  });
}

async function initializeDatabase() {
  const env = import.meta.env;
  let config = env.VITE_FIREBASE_API_KEY ? {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'ivf-directory-india.firebaseapp.com',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'ivf-directory-india',
    appId: env.VITE_FIREBASE_APP_ID,
  } : undefined;
  if (!config) {
    const response = await fetch('/__/firebase/init.json');
    if (!response.ok) throw new Error('Firebase is not configured.');
    config = await response.json();
  }
  if (!config?.apiKey) throw new Error('Firebase is not configured.');
  const app = getApps()[0] ?? initializeApp(config);
  const db = getFirestore(app);
  if (env.DEV && env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return db;
}

async function initializeAuth() {
  const db = await getFirebaseDb();
  const { connectAuthEmulator, getAuth } = await import('firebase/auth');
  const auth = getAuth(getApps()[0]);
  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  }
  await auth.authStateReady();
  return { auth, db };
}
