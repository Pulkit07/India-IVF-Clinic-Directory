import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

let client: Promise<{ auth: ReturnType<typeof getAuth>; db: ReturnType<typeof getFirestore> }> | undefined;
export function getFirebase() {
  return client ??= initialize().catch(error => { client = undefined; throw error; });
}
async function initialize() {
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
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (env.DEV && env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  await auth.authStateReady();
  return { auth, db };
}
