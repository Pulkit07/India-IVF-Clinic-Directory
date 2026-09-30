import { createHash, randomUUID } from "node:crypto";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { firestore } from "./lib/firebase";

const TYPES = new Set(["address", "phone", "name", "location", "success_rate", "closed", "duplicate", "other"]);
const HOUR_LIMIT = 5;
const DAY_LIMIT = 20;
const RETENTION_DAYS = 90;

type CorrectionInput = {
  clinicSlug?: unknown;
  correctionType?: unknown;
  message?: unknown;
  sourceUrl?: unknown;
  contactEmail?: unknown;
};

function requiredString(value: unknown, name: string, min: number, max: number): string {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    throw new HttpsError("invalid-argument", `${name} must contain ${min}-${max} characters.`);
  }
  return value;
}

function validate(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpsError("invalid-argument", "A correction is required.");
  const input = data as CorrectionInput;
  const clinicSlug = requiredString(input.clinicSlug, "clinicSlug", 1, 160);
  const correctionType = requiredString(input.correctionType, "correctionType", 1, 40);
  const message = requiredString(input.message, "message", 10, 5000);
  const contactEmail = requiredString(input.contactEmail, "contactEmail", 3, 320);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clinicSlug)) throw new HttpsError("invalid-argument", "clinicSlug is invalid.");
  if (!TYPES.has(correctionType)) throw new HttpsError("invalid-argument", "correctionType is invalid.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) throw new HttpsError("invalid-argument", "contactEmail is invalid.");
  const sourceUrl = input.sourceUrl == null || input.sourceUrl === "" ? null : requiredString(input.sourceUrl, "sourceUrl", 1, 2048);
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    } catch {
      throw new HttpsError("invalid-argument", "sourceUrl must be an HTTP(S) URL.");
    }
  }
  return { clinicSlug, correctionType, message, sourceUrl, contactEmail };
}

function windowKey(clientHash: string, window: "hour" | "day", date: Date): string {
  const stamp = window === "hour" ? date.toISOString().slice(0, 13) : date.toISOString().slice(0, 10);
  return createHash("sha256").update(`${clientHash}:${window}:${stamp}`).digest("hex");
}

export const submitCorrection = onCall(
  { region: "asia-south1", enforceAppCheck: true, consumeAppCheckToken: true, maxInstances: 10 },
  async request => {
    const input = validate(request.data);
    const ip = request.rawRequest.ip || request.rawRequest.socket.remoteAddress || "unknown";
    const appId = request.app?.appId || "unknown";
    const clientHash = createHash("sha256").update(`${appId}:${ip}`).digest("hex");
    const now = new Date();
    const id = randomUUID();
    const submissionRef = firestore.collection("correction_submissions").doc(id);
    const limits = [
      { ref: firestore.collection("correction_rate_limits").doc(windowKey(clientHash, "hour", now)), limit: HOUR_LIMIT },
      { ref: firestore.collection("correction_rate_limits").doc(windowKey(clientHash, "day", now)), limit: DAY_LIMIT },
    ];

    await firestore.runTransaction(async transaction => {
      const counters = await Promise.all(limits.map(item => transaction.get(item.ref)));
      counters.forEach((counter, index) => {
        if ((counter.data()?.count ?? 0) >= limits[index].limit) throw new HttpsError("resource-exhausted", "Too many corrections. Please try again later.");
      });
      limits.forEach(({ ref }, index) => transaction.set(ref, {
        count: (counters[index].data()?.count ?? 0) + 1,
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      }));
      transaction.create(submissionRef, {
        id,
        ...input,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
      });
    });

    return { id, receivedAt: now.toISOString() };
  },
);

export const deleteExpiredCorrections = onSchedule(
  { schedule: "every day 03:00", timeZone: "Asia/Kolkata", region: "asia-south1", retryCount: 3 },
  async () => {
    let deleted = 0;
    for (const collectionName of ["correction_submissions", "correction_rate_limits"]) {
      while (true) {
        const snapshot = await firestore.collection(collectionName).where("expiresAt", "<=", Timestamp.now()).limit(400).get();
        if (snapshot.empty) break;
        const batch = firestore.batch();
        snapshot.docs.forEach(document => batch.delete(document.ref));
        await batch.commit();
        deleted += snapshot.size;
      }
    }
    logger.info("Expired correction data deleted", { deleted, retentionDays: RETENTION_DAYS });
  },
);
