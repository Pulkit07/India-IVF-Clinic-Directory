import { createRequire } from "node:module";

const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const [uid, action] = process.argv.slice(2);
const project = process.env.GCLOUD_PROJECT ?? "ivf-directory-india";
if (!uid || !["grant", "revoke"].includes(action) || !process.argv.includes(`--project=${project}`)) {
  console.error(`Usage: node scripts/firebase-admin.mjs FIREBASE_UID grant|revoke --project=${project}`);
  process.exit(1);
}
initializeApp({ projectId: project });
await getFirestore().collection("admin_access").doc(uid).set({
  enabled: action === "grant",
  updatedAt: new Date(),
});
console.log(`Administrator access ${action === "grant" ? "granted" : "revoked"}.`);
