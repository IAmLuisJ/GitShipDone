import { describe, it, expect, beforeEach } from "vitest";
import api, { shouldAttemptTokenRefresh } from "./api";
import { useAuthStore } from "@/stores/authStore";

describe("api axios instance", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it("has baseURL /api", () => {
    expect(api.defaults.baseURL).toBe("/api");
  });

  it("has request interceptors configured", () => {
    expect(api.interceptors.request.handlers.length).toBeGreaterThan(0);
  });

  it("has response interceptors configured", () => {
    expect(api.interceptors.response.handlers.length).toBeGreaterThan(0);
  });

  it("does not try to refresh when a login attempt fails", () => {
    expect(
      shouldAttemptTokenRefresh({
        response: { status: 401 },
        config: { url: "/auth/login" },
      }),
    ).toBe(false);
  });

  it("tries to refresh once for protected 401 responses", () => {
    expect(
      shouldAttemptTokenRefresh({
        response: { status: 401 },
        config: { url: "/projects" },
      }),
    ).toBe(true);

    expect(
      shouldAttemptTokenRefresh({
        response: { status: 401 },
        config: { url: "/projects", _retry: true },
      }),
    ).toBe(false);
  });
});
