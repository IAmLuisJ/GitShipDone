import { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";

export type FeatureName = "ai" | "github" | "oauth";

/**
 * Deployment feature flags for post-MVP surfaces (see docs/ROADMAP.md).
 * All flags default off; enable with FEATURE_<NAME>=true in the server
 * environment. Read at request time so tests can toggle them.
 */
export function isFeatureEnabled(feature: FeatureName): boolean {
  return process.env[`FEATURE_${feature.toUpperCase()}`] === "true";
}

/**
 * Middleware that 404s the request when the given feature is disabled,
 * so gated routes are indistinguishable from unknown routes.
 */
export function requireFeature(feature: FeatureName) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (isFeatureEnabled(feature)) {
      next();
      return;
    }
    next(new AppError("Not found", 404));
  };
}
