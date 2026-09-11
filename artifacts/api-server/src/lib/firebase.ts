import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app = getApps()[0] ?? initializeApp({
  projectId: process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "ivf-directory-india",
});

// Cloud Functions uses its service account; local tools use Application Default Credentials.
export const firestore = getFirestore(app);
export const firebaseAuth = getAuth(app);
