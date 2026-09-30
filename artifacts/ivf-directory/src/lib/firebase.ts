import { getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

let databaseClient: Promise<ReturnType<typeof initializeFirestore>> | undefined;
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
  const appCheckSiteKey = env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  if (appCheckSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  const db = initializeFirestore(app, {
    // Some mobile networks, privacy tools, and buffering proxies block
    // Firestore's streaming WebChannel transport. Long polling keeps the
    // public directory available in those environments.
    experimentalForceLongPolling: true,
  });
  if (env.DEV && env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return db;
}

export async function getFirebaseFunctions() {
  await getFirebaseDb();
  const functions = getFunctions(getApps()[0], 'asia-south1');
  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
  return functions;
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
