import { afterEach, describe, expect, it, vi } from "vitest";

import { isFeatureEnabled } from "./features";

describe("isFeatureEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled only when the env var is exactly 'true'", () => {
    vi.stubEnv("VITE_FEATURE_AI", "true");
    expect(isFeatureEnabled("ai")).toBe(true);

    vi.stubEnv("VITE_FEATURE_AI", "1");
    expect(isFeatureEnabled("ai")).toBe(false);

    vi.stubEnv("VITE_FEATURE_AI", "false");
    expect(isFeatureEnabled("ai")).toBe(false);
  });

  it("defaults to disabled when the env var is unset", () => {
    vi.stubEnv("VITE_FEATURE_GITHUB", "");
    expect(isFeatureEnabled("github")).toBe(false);
  });
});
