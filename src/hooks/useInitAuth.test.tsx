import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/authStore";
import { resetInitAuthForTests, useInitAuth } from "./useInitAuth";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const user = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  aiProvider: null,
  createdAt: "2026-01-01",
  githubConnected: false,
  hasAiKey: false,
  hasPassword: true,
  emailNotificationsEnabled: true,
};

describe("useInitAuth", () => {
  beforeEach(() => {
    resetInitAuthForTests();
    vi.clearAllMocks();
    window.localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it("refreshes the access token and loads the current user", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { accessToken: "new-token" } });
    vi.mocked(axios.get).mockResolvedValue({ data: user });

    const { result } = renderHook(() => useInitAuth());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(axios.post).toHaveBeenCalledWith(
      "/api/auth/refresh",
      {},
      { withCredentials: true },
    );
    expect(axios.get).toHaveBeenCalledWith("/api/users/me", {
      headers: { Authorization: "Bearer new-token" },
    });
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().accessToken).toBe("new-token");
  });

  it("clears stale auth when refresh fails", async () => {
    useAuthStore.getState().setAuth(user, "stale-token");
    vi.mocked(axios.post).mockRejectedValue(new Error("No refresh cookie"));

    const { result } = renderHook(() => useInitAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
