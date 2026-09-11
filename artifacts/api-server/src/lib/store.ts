import { createHash, randomUUID } from "node:crypto";
import { Timestamp, type Query, type Transaction } from "firebase-admin/firestore";
import type { Clinic, Service, Source, RateObservation, AuditEvent } from "@workspace/db/schema";
import { firestore } from "./firebase";

export type StoredClinic = Clinic & { serviceIds: string[] };
type Correction = { id: string; clinicSlug: string; observationId: string | null; message: string; contactEmail: string; status: string; createdAt: Date };
export type Records = { clinics: StoredClinic; services: Service; sources: Source; rate_observations: RateObservation; audit_events: AuditEvent; correction_submissions: Correction };
export type Collection = keyof Records;

export class StoreError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function decode(value: any): any {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object" && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
  return value;
}

export function uniqueRef(collection: string, field: string, value: string) {
  return firestore.collection("_unique").doc(createHash("sha256").update(JSON.stringify([collection, field, value])).digest("hex"));
}

const uniqueFields: Partial<Record<Collection, string>> = { clinics: "slug", services: "slug", sources: "url" };

function defaults(collection: Collection): Record<string, unknown> {
  const now = new Date();
  switch (collection) {
    case "clinics": return { address: null, latitude: null, longitude: null, licensingStatus: null, regulator: null, phone: null, email: null, website: null, recordStatus: "draft", lastReviewedAt: now.toISOString().slice(0, 10), demonstrationData: false, serviceIds: [], updatedAt: now };
    case "services": return { description: null };
    case "sources": return { publisher: null, publishedOn: null, notes: null };
    case "rate_observations": return { numerator: null, denominatorCount: null, ageMeasurementPoint: null, priorTreatmentCohort: null, supersedesId: null, smallSample: false, verificationStatus: "unverified", publicationStatus: "draft", updatedAt: now };
    case "correction_submissions": return { observationId: null, status: "pending" };
    default: return {};
  }
}

export async function list<K extends Collection>(collection: K, options: { where?: [string, string]; orderBy?: string; descending?: boolean; limit?: number } = {}): Promise<Records[K][]> {
  let query: Query = firestore.collection(collection);
  if (options.where) query = query.where(options.where[0], "==", options.where[1]);
  if (options.orderBy) query = query.orderBy(options.orderBy, options.descending ? "desc" : "asc");
  if (options.limit) query = query.limit(options.limit);
  return (await query.get()).docs.map(doc => decode({ ...doc.data(), id: doc.id }) as Records[K]);
}

export async function get<K extends Collection>(collection: K, id: string): Promise<Records[K] | undefined> {
  if (!id || id.includes("/")) return undefined;
  const doc = await firestore.collection(collection).doc(id).get();
  return doc.exists ? decode({ ...doc.data(), id: doc.id }) as Records[K] : undefined;
}

export async function getMany<K extends Collection>(collection: K, ids: string[]): Promise<Records[K][]> {
  const unique = [...new Set(ids)].filter(id => id && !id.includes("/"));
  const result: Records[K][] = [];
  for (let start = 0; start < unique.length; start += 100) {
    const docs = await firestore.getAll(...unique.slice(start, start + 100).map(id => firestore.collection(collection).doc(id)));
    result.push(...docs.filter(doc => doc.exists).map(doc => decode({ ...doc.data(), id: doc.id }) as Records[K]));
  }
  return result;
}

async function validateReferences(tx: Transaction, collection: Collection, value: any) {
  const refs: Array<[string, string]> = [];
  if (collection === "clinics") refs.push(...(value.serviceIds as string[]).map(id => ["services", id] as [string, string]));
  if (collection === "rate_observations") {
    refs.push(["clinics", value.clinicId], ["sources", value.sourceId]);
    if (value.supersedesId) refs.push(["rate_observations", value.supersedesId]);
    if (!Number.isFinite(Number(value.ratePercentage)) || Number(value.ratePercentage) < 0 || Number(value.ratePercentage) > 100) throw new StoreError(400, "Rate must be between 0 and 100.");
    if (value.reportingPeriodStart > value.reportingPeriodEnd) throw new StoreError(400, "Reporting period end must not precede its start.");
    if (value.publicationStatus === "published" && (!value.outcomeDefinition || !value.denominatorDefinition || !value.reportingPeriodStart || !value.reportingPeriodEnd || value.verificationStatus === "unverified")) throw new StoreError(400, "Definitions, reporting period, and verification are required to publish.");
  }
  for (const [name, id] of refs) {
    if (!id || id.includes("/") || !(await tx.get(firestore.collection(name).doc(id))).exists) throw new StoreError(400, `Referenced ${name} record does not exist.`);
  }
}

// Every admin write, unique-key reservation, and audit event commits atomically.
export async function save<K extends Collection>(collection: K, input: Record<string, unknown>, actor?: string, id?: string): Promise<Records[K]> {
  if (id && id.includes("/")) throw new StoreError(400, "Invalid record ID.");
  const ref = firestore.collection(collection).doc(id ?? randomUUID());
  return firestore.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (id && !snapshot.exists) throw new StoreError(404, "Record not found.");
    const before = snapshot.exists ? decode(snapshot.data()) : null;
    const data = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
    const after = { ...(before ?? { ...defaults(collection), createdAt: new Date() }), ...data, id: ref.id } as any;
    if (collection === "clinics" || collection === "rate_observations") after.updatedAt = new Date();
    await validateReferences(tx, collection, after);
    const field = uniqueFields[collection];
    let reservation;
    if (field) {
      reservation = uniqueRef(collection, field, after[field]);
      const existing = await tx.get(reservation);
      if (existing.exists && existing.get("entityId") !== ref.id) throw new StoreError(409, `A ${collection} record with this ${field} already exists.`);
    }
    if (field && reservation) {
      if (before && before[field] !== after[field]) tx.delete(uniqueRef(collection, field, before[field]));
      tx.set(reservation, { entityId: ref.id });
    }
    tx.set(ref, after);
    if (actor) {
      const audit = firestore.collection("audit_events").doc(randomUUID());
      tx.create(audit, { id: audit.id, actorUserId: actor, action: id ? "update" : "create", entityType: collection, entityId: ref.id, beforeSnapshot: before, afterSnapshot: after, createdAt: new Date() });
    }
    return after as Records[K];
  });
}
