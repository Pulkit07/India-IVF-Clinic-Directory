import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT ?? 5001);
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("Invalid PORT");
app.listen(port, () => logger.info({ port }, "Server listening"));
