import { onRequest } from "firebase-functions/v2/https";
import app from "./app";

export const api = onRequest({ region: "asia-south1", memory: "256MiB", timeoutSeconds: 60, maxInstances: 10, invoker: "public" }, app);
