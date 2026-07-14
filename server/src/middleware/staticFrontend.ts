import path from "path";
import express, { Express } from "express";

/**
 * In production, serve the built frontend from STATIC_DIR with an SPA
 * fallback so client-side routes resolve to index.html. API routes are
 * excluded. No-op outside production or when STATIC_DIR is unset.
 */
export function serveFrontend(app: Express): void {
  const staticDir = process.env.STATIC_DIR;
  if (process.env.NODE_ENV !== "production" || !staticDir) return;

  const resolved = path.resolve(staticDir);
  app.use(express.static(resolved));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(resolved, "index.html"));
  });
}
