import { createRequire } from "node:module";

const requireApi = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const { applicationDefault, deleteApp, initializeApp } = requireApi("firebase-admin/app");
const { FieldValue, getFirestore } = requireApi("firebase-admin/firestore");

const write = process.argv.includes("--write");
const projectArg = process.argv.find(argument => argument.startsWith("--project="));
const projectId = projectArg?.slice("--project=".length);
if (!projectId) throw new Error("Pass an explicit --project=PROJECT_ID.");

const app = initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app);
let scanned = 0;
let affected = 0;

try {
  let cursor;
  while (true) {
    let query = db.collection("rate_observations").orderBy("__name__").limit(400);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    const batch = db.batch();
    for (const document of snapshot.docs) {
      scanned++;
      if (Object.hasOwn(document.data().source ?? {}, "notes")) {
        affected++;
        if (write) batch.update(document.ref, { "source.notes": FieldValue.delete() });
      }
    }
    if (write) await batch.commit();
    cursor = snapshot.docs.at(-1);
  }
  console.log(`${write ? "Removed" : "Found"} public source notes in ${affected} of ${scanned} observations${write ? "." : "; rerun with --write to remove them."}`);
} finally {
  await db.terminate();
  await deleteApp(app);
}
