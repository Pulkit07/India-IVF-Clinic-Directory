import { onRequest } from "firebase-functions/v2/https";
import app from "./app";

export { notifyCorrectionSubmission } from "./correction-notifications";
export { deleteExpiredCorrections, submitCorrection } from "./correction-submissions";

export const api = onRequest({ region: "asia-south1", memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, invoker: "public" }, app);
