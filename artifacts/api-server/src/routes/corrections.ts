import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/corrections", (_req, res): void => {
  // Correction intake is exclusively handled by the App Check-protected callable
  // function. Keeping this legacy route writable would bypass that protection.
  res.status(410).json({ error: "Use the website correction form." });
});

export default router;
