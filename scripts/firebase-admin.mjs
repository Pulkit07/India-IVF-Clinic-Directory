import { createRequire } from "node:module";

const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const [uid, action] = process.argv.slice(2);
const project = process.env.GCLOUD_PROJECT ?? "ivf-directory-india";
if (!uid || !["grant", "revoke"].includes(action) || !process.argv.includes(`--project=${project}`)) {
  console.error(`Usage: node scripts/firebase-admin.mjs FIREBASE_UID grant|revoke --project=${project}`);
  process.exit(1);
}
initializeApp({ projectId: project });
const auth = getAuth();
const user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, { ...user.customClaims, admin: action === "grant" });
// Old ID tokens cannot retain a revoked grant until their normal expiry.
if (action === "revoke") await auth.revokeRefreshTokens(uid);
console.log(`Administrator access ${action === "grant" ? "granted" : "revoked"}. Sign out and back in to refresh the session.`);
