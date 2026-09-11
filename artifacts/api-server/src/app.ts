import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { StoreError } from "./lib/store";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error instanceof StoreError ? error.status : error?.type === "entity.too.large" ? 413 : error instanceof SyntaxError ? 400 : 500;
  if (status === 500) logger.error({ err: error }, "API request failed");
  res.status(status).json({ error: status === 500 ? "The request could not be completed." : error.message });
};
app.use(handleError);

export default app;
