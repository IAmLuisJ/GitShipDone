import { describe, it, expect, beforeEach } from "vitest";
import api from "./api";
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
});
