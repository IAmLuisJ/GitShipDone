/**
 * Deployment feature flags for post-MVP surfaces (see docs/ROADMAP.md).
 * All flags default off; enable with VITE_FEATURE_<NAME>=true at
 * build/dev time. Flags are read at call time so tests can stub them.
 */
const FEATURE_ENV_KEYS = {
  ai: "VITE_FEATURE_AI",
  github: "VITE_FEATURE_GITHUB",
  oauth: "VITE_FEATURE_OAUTH",
} as const;

export type FeatureName = keyof typeof FEATURE_ENV_KEYS;

export function isFeatureEnabled(feature: FeatureName): boolean {
  return import.meta.env[FEATURE_ENV_KEYS[feature]] === "true";
}
