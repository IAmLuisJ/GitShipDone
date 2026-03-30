import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it("starts with null user and token", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it("setAuth stores user and token", () => {
    const user = {
      id: "u1",
      email: "a@b.com",
      name: "Test",
      avatarUrl: null,
      aiProvider: null,
      createdAt: "2026-01-01",
    };
    useAuthStore.getState().setAuth(user, "tok123");
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe("tok123");
  });

  it("clearAuth resets to null", () => {
    const user = {
      id: "u1",
      email: "a@b.com",
      name: "Test",
      avatarUrl: null,
      aiProvider: null,
      createdAt: "2026-01-01",
    };
    useAuthStore.getState().setAuth(user, "tok123");
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});
