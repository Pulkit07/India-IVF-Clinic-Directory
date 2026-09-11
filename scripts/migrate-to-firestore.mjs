import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const requireApi = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const requireDb = createRequire(new URL("../lib/db/package.json", import.meta.url));
const { initializeApp } = requireApi("firebase-admin/app");
const { getFirestore } = requireApi("firebase-admin/firestore");
const { Pool } = requireDb("pg");

export function normalize(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}

const camel = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
const tables = ["services", "sources", "clinics", "clinic_services", "rate_observations", "correction_submissions", "audit_events", "admin_profiles"];
const uniqueFields = { clinics: "slug", services: "slug", sources: "url" };

export async function migrateRecords(firestore, data) {
  // Preflight the entire target before writing. Never replace records already edited there.
  for (const [collection, rows] of Object.entries(data)) for (const row of rows) {
    const existing = await firestore.collection(collection).doc(row.id).get();
    if (existing.exists && !isDeepStrictEqual(normalize(existing.data()), normalize(row))) throw new Error(`Destination differs: ${collection}/${row.id}. Migration stopped without replacing it.`);
    const field = uniqueFields[collection];
    if (field) {
      const duplicates = await firestore.collection(collection).where(field, "==", row[field]).get();
      if (duplicates.docs.some(doc => doc.id !== row.id)) throw new Error(`Destination ${collection} has a conflicting ${field}.`);
    }
  }
  for (const [collection, rows] of Object.entries(data)) for (const row of rows) {
    const ref = firestore.collection(collection).doc(row.id);
    await firestore.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (existing.exists && !isDeepStrictEqual(normalize(existing.data()), normalize(row))) throw new Error(`Destination changed during migration: ${collection}/${row.id}`);
      const field = uniqueFields[collection];
      let unique;
      if (field) {
        unique = firestore.collection("_unique").doc(createHash("sha256").update(JSON.stringify([collection, field, row[field]])).digest("hex"));
        const reserved = await tx.get(unique);
        if (reserved.exists && reserved.get("entityId") !== row.id) throw new Error(`Unique ${field} conflict in ${collection}.`);
      }
      if (!existing.exists) tx.create(ref, row);
      if (unique) tx.set(unique, { entityId: row.id });
    });
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const project = process.env.GCLOUD_PROJECT ?? "ivf-directory-india";
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the existing PostgreSQL database.");
  if (write && !process.argv.includes(`--project=${project}`)) throw new Error(`Writes require --project=${project} to confirm the destination.`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const data = {};
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    for (const table of tables) data[table] = (await client.query(`SELECT * FROM "${table}"`)).rows.map(camel);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); await pool.end(); }

  for (const clinic of data.clinics) clinic.serviceIds = data.clinic_services.filter(link => link.clinicId === clinic.id).map(link => link.serviceId).sort();
  delete data.clinic_services;
  // Historical identities are preserved as reference only, never as Firebase grants.
  data._legacy_admin_profiles = data.admin_profiles;
  delete data.admin_profiles;
  for (const rows of Object.values(data)) for (const row of rows) {
    for (const key of ["lastReviewedAt", "publishedOn", "reportingPeriodStart", "reportingPeriodEnd"]) {
      if (row[key] instanceof Date) {
        const date = row[key];
        row[key] = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      }
    }
  }
  for (const [collection, rows] of Object.entries(data)) console.log(`${collection}: ${rows.length}`);
  if (!write) { console.log("Dry run complete. No Firestore data was written."); return; }

  initializeApp({ projectId: project });
  const firestore = getFirestore();
  await migrateRecords(firestore, data);
  console.log("Migration complete. Existing matching records were retained; IDs and relationships were preserved.");
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
