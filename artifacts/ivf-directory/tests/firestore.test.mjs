import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp, terminate } from 'firebase/firestore';
import { fileURLToPath } from 'node:url';
assert(process.env.GCLOUD_PROJECT?.startsWith('demo-') && process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Use isolated Firebase emulators.');
const projectId = process.env.GCLOUD_PROJECT;
const apiRequire = createRequire(new URL('../../api-server/package.json', import.meta.url));
const { build } = apiRequire('esbuild');
await build({ entryPoints: [fileURLToPath(new URL('../src/lib/directory-store.ts', import.meta.url))], outfile: fileURLToPath(new URL('../dist/test-store.mjs', import.meta.url)), bundle: true, platform: 'node', format: 'esm', external: ['firebase/*'] });
const { createDirectoryStore, uniqueKey, previewImport } = await import('../dist/test-store.mjs');
const { initializeApp: adminInitialize } = apiRequire('firebase-admin/app');
const { getAuth: adminAuth } = apiRequire('firebase-admin/auth');
const { getFirestore: adminFirestore } = apiRequire('firebase-admin/firestore');
adminInitialize({ projectId });
const trusted = adminFirestore();
const apps = [];
function client(name) {
  const app = initializeApp({ projectId, apiKey: 'emulator-key' }, name); apps.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const db = getFirestore(app); const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':'); connectFirestoreEmulator(db, host, Number(port));
  return { db, auth, store: createDirectoryStore(db, () => auth.currentUser?.uid) };
}
const editor = client('editor'), visitor = client('visitor'), reader = client('reader');
let checks = 0;
function check(value, message) { assert(value, message); checks++; }
async function denied(action, message) { await assert.rejects(action, error => error.code === 'permission-denied', message); checks++; }
const suffix = Date.now();
try {
  for (const [c, name] of [[editor, 'editor'], [reader, 'reader']]) {
    const email = `${name}-${suffix}@example.test`;
    await adminAuth().createUser({ email, password: 'only-for-local-emulators' });
    await signInWithEmailAndPassword(c.auth, email, 'only-for-local-emulators');
  }
  await trusted.doc(`admin_access/${editor.auth.currentUser.uid}`).set({ enabled: true });
  check((await visitor.store.listClinics()).total === 0, 'Empty directory loads without login');
  await denied(() => reader.store.createService({ name: 'Unauthorized', slug: 'unauthorized' }), 'Ordinary account cannot edit');
  await denied(() => setDoc(doc(reader.db, 'admin_access', reader.auth.currentUser.uid), { enabled: true }), 'Cannot grant own access');
  const service = await editor.store.createService({ name: 'IVF', slug: 'ivf', description: null }); checks++;
  await assert.rejects(() => editor.store.createService({ name: 'Duplicate', slug: 'ivf' }), /already exists/); checks++;
  const parallel = await Promise.allSettled([1, 2].map(() => editor.store.createService({ name: 'Concurrent', slug: 'concurrent' })));
  check(parallel.filter(result => result.status === 'fulfilled').length === 1, 'Concurrent duplicate prevented');
  const source = await editor.store.createSource({ title: 'Source', sourceType: 'Registry', url: 'https://example.test/source', notes: 'Verified source context', publishedOn: '2025-01-01' }); checks++;
  await denied(() => getDoc(doc(visitor.db, 'sources', source.id)), 'Unpublished sources stay private');
  const input = { name: 'Clinic', slug: 'clinic', city: 'Bengaluru', state: 'Karnataka', serviceIds: [service.id] };
  const clinic = await editor.store.createClinic(input); checks++;
  check(clinic.services[0].id === service.id, 'Services persisted');
  await denied(() => getDoc(doc(visitor.db, 'clinics', clinic.id)), 'Draft get denied');
  await denied(() => getDocs(collection(visitor.db, 'clinics')), 'Unfiltered clinic list denied');
  check((await visitor.store.listClinics()).total === 0, 'Draft hidden from directory');
  await editor.store.publishClinic(clinic.id); checks++;
  check((await visitor.store.getClinic('clinic')).name === 'Clinic', 'Published profile loads');
  await denied(() => updateDoc(doc(editor.db, 'clinics', clinic.id), { name: 'No audit' }), 'Even admin edits require audit');
  await denied(() => editor.store.updateClinic(clinic.id, { ...input, serviceIds: ['missing'] }), 'Missing service rejected');
  await denied(() => editor.store.updateClinic(clinic.id, { ...input, latitude: 200 }), 'Invalid latitude rejected');
  const observationInput = { clinicId: clinic.id, sourceId: source.id, outcomeType: 'Live birth', outcomeDefinition: ' Live birth ', denominatorType: 'Cycles', denominatorDefinition: 'Initiated cycles', ratePercentage: 30, numerator: 30, denominatorCount: 100, ageBand: 'Under 35', eggSource: 'Own', treatmentContext: 'Fresh', treatmentType: 'IVF', cumulativeMethod: 'Single cycle', reportingPeriodStart: '2025-01-01', reportingPeriodEnd: '2025-12-31', yearLabel: '2025', methodologyNotes: 'Test fixture', verificationStatus: 'verified' };
  const observation = await editor.store.createRateObservation(observationInput); checks++;
  await denied(() => getDoc(doc(visitor.db, 'rate_observations', observation.id)), 'Draft observation private');
  await editor.store.publishRateObservation(observation.id); checks++;
  const profile = await visitor.store.getClinic('clinic');
  check(profile.observations.length === 1 && profile.observations[0].source.id === source.id, 'Published source snapshot visible');
  check((await visitor.store.listClinics({ service: 'ivf', reportingYear: 2025 })).total === 1, 'Service and observation filters work');
  check((await visitor.store.listClinics({ reportingYear: 2024 })).total === 0, 'Unmatched cohort excluded');
  const unverified = await editor.store.createRateObservation({ ...observationInput, verificationStatus: 'unverified' });
  await denied(() => editor.store.publishRateObservation(unverified.id), 'Unverified publication rejected');
  await denied(() => editor.store.createRateObservation({ ...observationInput, ratePercentage: 101 }), 'Out of range rate rejected');
  await denied(() => editor.store.createRateObservation({ ...observationInput, reportingPeriodEnd: '2024-01-01' }), 'Reversed dates rejected');
  // Forge a complete audited transaction to prove the rules validate data, not just the SDK.
  const before = (await getDoc(doc(editor.db, 'rate_observations', observation.id))).data();
  const fakeAudit = doc(collection(editor.db, 'audit_events'));
  const forged = { ...before, source: { ...before.source, url: 'https://example.test/forged' }, auditId: fakeAudit.id, updatedAt: serverTimestamp() };
  const batch = writeBatch(editor.db);
  batch.set(doc(editor.db, 'rate_observations', observation.id), forged);
  batch.set(fakeAudit, { id: fakeAudit.id, actorUserId: editor.auth.currentUser.uid, action: 'update', entityType: 'rate_observations', entityId: observation.id, beforeSnapshot: before, afterSnapshot: forged, createdAt: serverTimestamp() });
  await denied(() => batch.commit(), 'Forged source snapshot rejected with valid audit');
  await editor.store.unpublishRateObservation(observation.id);
  check((await visitor.store.getClinic('clinic')).observations.length === 0, 'Unpublished observation hidden');
  await editor.store.publishRateObservation(observation.id);
  await editor.store.updateClinic(clinic.id, { ...input, slug: 'renamed-clinic' }); checks++;
  check(!(await getDoc(doc(editor.db, 'unique_keys', await uniqueKey('clinics', 'clinic')))).exists(), 'Old slug reservation released');
  const correction = await visitor.store.submitCorrection({ clinicSlug: 'renamed-clinic', message: 'Please correct this clinic address.', contactEmail: 'test@example.test' }); checks++;
  await denied(() => getDoc(doc(visitor.db, 'correction_submissions', correction.id)), 'Receipt does not expose submission');
  await denied(() => getDocs(collection(reader.db, 'correction_submissions')), 'Ordinary users cannot read corrections');
  await denied(() => visitor.store.submitCorrection({ clinicSlug: 'renamed-clinic', message: 'short', contactEmail: 'invalid' }), 'Malformed correction rejected');
  await denied(() => setDoc(doc(visitor.db, 'correction_submissions', 'forged'), { id: 'forged', clinicSlug: 'renamed-clinic', observationId: null, message: 'This has forged status.', contactEmail: 'test@example.test', status: 'approved', createdAt: serverTimestamp() }), 'Forged correction status rejected');
  const audits = await editor.store.listAuditEvents();
  check(audits.some(event => event.beforeSnapshot?.slug === 'clinic' && event.afterSnapshot?.slug === 'renamed-clinic'), 'Before and after snapshots persisted');
  await denied(() => updateDoc(doc(editor.db, 'audit_events', audits[0].id), { action: 'forged' }), 'Audits immutable');
  await denied(() => deleteDoc(doc(editor.db, 'audit_events', audits[0].id)), 'Audit deletion denied');
  await denied(() => getDocs(collection(visitor.db, 'audit_events')), 'Audit history private');
  const summary = await editor.store.getAdminSummary();
  check(summary.clinicCount === 1 && summary.pendingCorrectionCount === 1, 'Admin counts correct');
  await editor.store.archiveClinic(clinic.id);
  check((await visitor.store.listClinics()).total === 0, 'Archived clinic hidden');
  await denied(() => getDoc(doc(visitor.db, 'rate_observations', observation.id)), 'Archived parent hides published observation');
  await denied(() => getDocs(query(collection(visitor.db, 'rate_observations'), where('clinicId', '==', clinic.id), where('publicationStatus', '==', 'published'))), 'Archived parent observation query denied');
  await trusted.doc(`admin_access/${editor.auth.currentUser.uid}`).update({ enabled: false });
  await denied(() => editor.store.listAdminClinics(), 'Membership revocation blocks existing token immediately');
  await denied(() => editor.store.createService({ name: 'Revoked', slug: 'revoked' }), 'Revoked admin cannot write');
  const preview = await previewImport({ csvText: 'name,city,state\n"Test, Clinic",Bengaluru,Karnataka\n"Test, Clinic",Bengaluru,Karnataka\nBad,,Karnataka', mapping: {} });
  check(preview.validRows === 1 && preview.duplicateRows === 1 && preview.invalidRows === 1, 'CSV preview parses quoted values and validates rows');
  console.log(`PASS: ${checks} direct Firestore SDK and security-rules checks.`);
} finally {
  await Promise.all(apps.map(async app => { await terminate(getFirestore(app)); await deleteApp(app); }));
  await trusted.terminate();
}
