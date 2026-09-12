import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(
  new URL("../artifacts/api-server/package.json", import.meta.url),
);
const { deleteApp, initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const args = process.argv.slice(2);
const write = args.includes("--write");
const sourcePath = args.find((arg) => !arg.startsWith("--"));
const project =
  args.find((arg) => arg.startsWith("--project="))?.split("=")[1] ??
  process.env.GCLOUD_PROJECT ??
  "ivf-directory-india";

if (!sourcePath) {
  throw new Error(
    "Usage: node scripts/import-bangalore-clinics.mjs SOURCE.md [--write] --project=PROJECT_ID",
  );
}
if (write && !args.includes(`--project=${project}`)) {
  throw new Error(`Writes require --project=${project} to confirm the destination.`);
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseSource(markdown) {
  const clinics = [];
  let area = "";

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## (.+)$/);
    if (heading) {
      area = heading[1];
      continue;
    }
    if (!area || !line.startsWith("|") || line.includes("|---")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 4 || cells[0] === "Center") continue;

    const rating = cells[2].match(/^(\d(?:\.\d)?) \((\d+)\)$/);
    if (!rating) continue;

    const [name, address, , listedPhone] = cells;
    const slug = slugify(`${name}-${area}`);
    const id = `blr_${createHash("sha256").update(slug).digest("hex").slice(0, 24)}`;
    clinics.push({
      id,
      slug,
      name,
      city: area,
      state: "Karnataka",
      address: `${address}, ${area}, Bengaluru, Karnataka`,
      latitude: null,
      longitude: null,
      licensingStatus: null,
      regulator: null,
      phone: listedPhone === "—" ? null : listedPhone,
      email: null,
      website: null,
      googleRating: Number(rating[1]),
      googleReviewCount: Number(rating[2]),
      dataSource: "Google Places — Bangalore_IVF_Centers_by_Area.md",
      dataRetrievedAt: "2026-09-12",
      recordStatus: "published",
      lastReviewedAt: "2026-09-12",
      demonstrationData: false,
      serviceIds: [],
    });
  }

  const slugs = new Set();
  for (const clinic of clinics) {
    if (!clinic.slug || clinic.slug.length > 160) {
      throw new Error(`Invalid slug for ${clinic.name}: ${clinic.slug}`);
    }
    if (slugs.has(clinic.slug)) {
      throw new Error(`Duplicate generated slug: ${clinic.slug}`);
    }
    slugs.add(clinic.slug);
  }
  if (!clinics.length) throw new Error("No clinic rows found in the source file.");

  return clinics;
}

const markdown = await readFile(sourcePath, "utf8");
const clinics = parseSource(markdown);
const areas = new Set(clinics.map((clinic) => clinic.city));
const missingPhones = clinics.filter((clinic) => !clinic.phone).length;

console.log(
  `Validated ${clinics.length} clinics across ${areas.size} areas (${missingPhones} without phone numbers).`,
);
if (!write) {
  console.log("Dry run complete. No Firestore data was written.");
  process.exit(0);
}

const app = initializeApp({ projectId: project });
const firestore = getFirestore(app);

try {
  const snapshot = await firestore.collection("clinics").get();
  const existingById = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));
  const existingBySlug = new Map(
    snapshot.docs.map((doc) => [doc.get("slug"), doc.id]),
  );

  for (const clinic of clinics) {
    const conflictingId = existingBySlug.get(clinic.slug);
    if (conflictingId && conflictingId !== clinic.id) {
      throw new Error(
        `Existing clinic ${conflictingId} already uses slug ${clinic.slug}. No data was written.`,
      );
    }
  }

  const now = Timestamp.now();
  const actor = "system:bangalore-master-import";
  const batch = firestore.batch();
  let archived = 0;

  for (const doc of snapshot.docs) {
    const before = doc.data();
    if (!before.demonstrationData || before.recordStatus === "archived") continue;

    const auditRef = firestore.collection("audit_events").doc();
    const after = {
      ...before,
      recordStatus: "archived",
      updatedAt: now,
      auditId: auditRef.id,
    };
    batch.set(doc.ref, after);
    batch.set(auditRef, {
      id: auditRef.id,
      actorUserId: actor,
      action: "archive",
      entityType: "clinics",
      entityId: doc.id,
      beforeSnapshot: before,
      afterSnapshot: after,
      createdAt: now,
    });
    archived += 1;
  }

  for (const clinic of clinics) {
    const ref = firestore.collection("clinics").doc(clinic.id);
    const before = existingById.get(clinic.id) ?? null;
    const auditRef = firestore.collection("audit_events").doc();
    const after = {
      ...clinic,
      createdAt: before?.createdAt ?? now,
      updatedAt: now,
      auditId: auditRef.id,
    };
    const uniqueId = `clinics_${createHash("sha256").update(clinic.slug).digest("hex")}`;
    const uniqueRef = firestore.collection("unique_keys").doc(uniqueId);

    batch.set(ref, after);
    batch.set(uniqueRef, {
      entityType: "clinics",
      entityId: clinic.id,
      value: clinic.slug,
    });
    batch.set(auditRef, {
      id: auditRef.id,
      actorUserId: actor,
      action: before ? "update" : "create",
      entityType: "clinics",
      entityId: clinic.id,
      beforeSnapshot: before,
      afterSnapshot: after,
      createdAt: now,
    });
  }

  await batch.commit();
  console.log(
    `Imported ${clinics.length} published clinics and archived ${archived} demonstration clinics in ${project}.`,
  );
} finally {
  await firestore.terminate();
  await deleteApp(app);
}
