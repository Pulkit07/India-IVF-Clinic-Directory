import assert from "node:assert/strict";
import { migrateRecords, normalize } from "./migrate-to-firestore.mjs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

assert(process.env.FIRESTORE_EMULATOR_HOST, "Run through firebase emulators:exec.");
assert(process.env.FIREBASE_AUTH_EMULATOR_HOST, "Authentication emulator is required.");
assert((process.env.GCLOUD_PROJECT ?? "").startsWith("demo-"), "Tests require an isolated demo project.");
process.env.NODE_ENV = "production";
process.env.LOG_LEVEL = "error";
const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const { build } = require("esbuild");
const pkg = require("./package.json");
await build({ entryPoints: [fileURLToPath(new URL("../artifacts/api-server/src/app.ts", import.meta.url))], outfile: fileURLToPath(new URL("../artifacts/api-server/dist/test-app.cjs", import.meta.url)), bundle: true, platform: "node", format: "cjs", external: Object.keys(pkg.dependencies).filter(name => !name.startsWith("@workspace/")) });
const app = require("./dist/test-app.cjs").default;
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const db = getFirestore();
const auth = getAuth();
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}/api`;
let checks = 0;
async function request(path, method = "GET", body, token, expected = 200) {
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${text}`);
  checks++;
  return text && JSON.parse(text);
}
async function signIn(email) {
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "local-emulator-only-password", returnSecureToken: true }) });
  const data = await response.json();
  assert(data.idToken, JSON.stringify(data));
  return data.idToken;
}
try {
  await request("/healthz");
  await request("/admin/summary", "GET", undefined, undefined, 401);
  await request("/admin/summary", "GET", undefined, "forged-token", 401);
  const suffix = Date.now();
  const viewer = await auth.createUser({ email: `viewer-${suffix}@example.test`, password: "local-emulator-only-password" });
  const admin = await auth.createUser({ email: `admin-${suffix}@example.test`, password: "local-emulator-only-password" });
  await auth.setCustomUserClaims(admin.uid, { admin: true });
  const viewerToken = await signIn(viewer.email);
  const token = await signIn(admin.email);
  await request("/admin/summary", "GET", undefined, viewerToken, 403);
  await request("/admin/summary", "GET", undefined, token);
  await request("/admin/clinics", "POST", {}, token, 400);
  const service = await request("/admin/services", "POST", { name: "IVF", slug: `ivf-${suffix}` }, token, 201);
  await request("/admin/services", "POST", { name: "Duplicate", slug: service.slug }, token, 409);
  const concurrent = await Promise.all([1, 2].map(() => fetch(base + "/admin/services", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Concurrent", slug: `concurrent-${suffix}` }) })));
  assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 409]); checks++;
  const source = await request("/admin/sources", "POST", { title: "Test source", sourceType: "Registry", url: `https://example.test/${suffix}`, publishedOn: "2025-01-01" }, token, 201);
  await request("/admin/sources", "POST", { title: "Duplicate", sourceType: "Registry", url: source.url }, token, 409);
  const clinicData = { name: "Test clinic", slug: `test-clinic-${suffix}`, city: "Bengaluru", state: "Karnataka", serviceIds: [service.id] };
  const clinic = await request("/admin/clinics", "POST", clinicData, token, 201);
  assert.equal(clinic.services[0].id, service.id);
  assert.equal(clinic.recordStatus, "draft");
  assert.equal(clinic.demonstrationData, false);
  await request("/admin/clinics", "POST", { ...clinicData, slug: `bad-${suffix}`, serviceIds: ["missing"] }, token, 400);
  await request(`/clinics/${clinic.slug}`, "GET", undefined, undefined, 404);
  // Published fixture represents a migrated existing directory record.
  await db.collection("clinics").doc(clinic.id).update({ recordStatus: "published" });
  const publicClinic = await request(`/clinics/${clinic.slug}`);
  assert.equal(publicClinic.services[0].id, service.id);
  const observationData = { clinicId: clinic.id, sourceId: source.id, outcomeType: "Live birth", outcomeDefinition: "Live birth", denominatorType: "Cycles", denominatorDefinition: "Initiated cycles", ratePercentage: 30, numerator: 30, denominatorCount: 100, ageBand: "Under 35", eggSource: "Own", treatmentContext: "Fresh", treatmentType: "IVF", cumulativeMethod: "Single cycle", reportingPeriodStart: "2025-01-01", reportingPeriodEnd: "2025-12-31", yearLabel: "2025", methodologyNotes: "Emulator fixture", verificationStatus: "unverified" };
  const unverified = await request("/admin/rate-observations", "POST", observationData, token, 201);
  await request(`/admin/rate-observations/${unverified.id}/publish`, "POST", {}, token, 400);
  const observation = await request("/admin/rate-observations", "POST", { ...observationData, verificationStatus: "verified" }, token, 201);
  assert.equal((await request(`/clinics/${clinic.slug}`)).observations.length, 0);
  await request(`/admin/rate-observations/${observation.id}/publish`, "POST", {}, token);
  const published = await request(`/clinics/${clinic.slug}`);
  assert.equal(published.observations.length, 1);
  assert.equal(published.observations[0].ratePercentage, 30);
  assert.equal(published.observations[0].source.id, source.id);
  assert.equal((await request("/clinics?service=" + service.slug)).total, 1);
  assert.equal((await request("/clinics?q=not-a-clinic")).total, 0);
  await request(`/admin/rate-observations/${observation.id}/unpublish`, "POST", {}, token);
  assert.equal((await request(`/clinics/${clinic.slug}`)).observations.length, 0);
  await request("/admin/rate-observations", "POST", { ...observationData, reportingPeriodEnd: "2024-12-31" }, token, 400);
  await request("/admin/rate-observations", "POST", { ...observationData, clinicId: "missing" }, token, 400);
  const correction = await request("/corrections", "POST", { clinicSlug: clinic.slug, message: "Please review this test record.", contactEmail: "test@example.test" }, undefined, 201);
  assert(correction.id && correction.receivedAt);
  await request("/corrections", "POST", {}, undefined, 400);
  const adminClinics = await request("/admin/clinics", "GET", undefined, token);
  assert.equal(adminClinics.find(item => item.id === clinic.id).services[0].id, service.id);
  const updated = await request(`/admin/clinics/${clinic.id}`, "PATCH", { ...clinicData, name: "Updated clinic", serviceIds: [] }, token);
  assert.equal(updated.services.length, 0);
  const summary = await request("/admin/summary", "GET", undefined, token);
  assert.equal(summary.pendingCorrectionCount, 1);
  const audits = await request("/admin/audit-events", "GET", undefined, token);
  assert(audits.some(event => event.entityId === clinic.id && event.beforeSnapshot?.name === "Test clinic" && event.afterSnapshot?.name === "Updated clinic"));
  const storedAudits = await db.collection("audit_events").where("entityId", "==", clinic.id).get();
  assert(storedAudits.docs.every(doc => doc.get("actorUserId") === admin.uid));
  assert(audits.every((event, i) => i === 0 || new Date(audits[i - 1].createdAt) >= new Date(event.createdAt)));
  // Even authenticated clients must not bypass the API to read/write Firestore.
  const firestoreBase = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents`;
  for (const path of [`clinics/${clinic.id}`, `correction_submissions/${correction.id}`, "audit_events"]) {
    const response = await fetch(`${firestoreBase}/${path}`, { headers: { Authorization: `Bearer ${viewerToken}` } });
    assert.equal(response.status, 403, `Rules must deny ${path}`); checks++;
  }
  const directWrite = await fetch(`${firestoreBase}/clinics/${clinic.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${viewerToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields: { recordStatus: { stringValue: "published" } } }) });
  assert.equal(directWrite.status, 403); checks++;
  await request(`/admin/clinics/${clinic.id}`, "DELETE", undefined, token, 204);
  await request(`/clinics/${clinic.slug}`, "GET", undefined, undefined, 404);
  await auth.updateUser(admin.uid, { disabled: true });
  await request("/admin/summary", "GET", undefined, token, 401);
  const migrated = { services: [{ id: `migration-${suffix}`, name: "Migrated service", slug: `migration-${suffix}`, description: null, createdAt: new Date("2025-01-01T00:00:00.000Z") }] };
  await migrateRecords(db, migrated);
  await migrateRecords(db, migrated);
  const migratedRef = db.collection("services").doc(migrated.services[0].id);
  assert.deepEqual(normalize((await migratedRef.get()).data()), normalize(migrated.services[0])); checks++;
  await migratedRef.update({ name: "Edited after migration" });
  await assert.rejects(() => migrateRecords(db, migrated), /Destination differs/); checks++;
  assert.equal((await migratedRef.get()).get("name"), "Edited after migration"); checks++;
  const duplicateMigration = { services: [{ ...migrated.services[0], id: `different-${suffix}` }] };
  await assert.rejects(() => migrateRecords(db, duplicateMigration), /conflicting slug/); checks++;
  console.log(`PASS: ${checks} API, authorization, uniqueness, publication, audit, security-rules, and migration checks.`);
} finally {
  server.close();
  await db.terminate();
}
