import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "./firebase";

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  res.setHeader("Cache-Control", "private, no-store");
  const match = req.headers.authorization?.match(/^Bearer (\S+)$/i);
  if (!match) {
    res.status(401).json({ error: "Sign in with your administrator account." });
    return;
  }
  try {
    const token = await firebaseAuth.verifyIdToken(match[1], true);
    if (token.admin !== true) {
      res.status(403).json({ error: "Administrator access is required." });
      return;
    }
    res.locals.adminUid = token.uid;
    next();
  } catch {
    res.status(401).json({ error: "Your session is invalid or expired. Sign in again." });
  }
}
