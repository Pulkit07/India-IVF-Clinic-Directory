import type { NextFunction, Request, Response } from "express";

/**
 * The public directory is usable without an account. Administrative writes
 * fail closed until managed Clerk authentication is configured for this
 * project. This avoids shipping a local password, JWT, or header-based bypass.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (process.env.CLERK_SECRET_KEY == null) {
    res.status(503).json({
      error: "Admin authentication is not configured for this demonstration.",
    });
    return;
  }

  res.status(401).json({
    error: "A signed-in administrator session is required.",
  });
}