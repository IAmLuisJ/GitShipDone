import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import AuthCallbackPage from "./AuthCallbackPage";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

const user = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  aiProvider: null,
  createdAt: "2026-01-01",
};

function LoginLocation() {
  const location = useLocation();
  return <div data-testid="login-location">{location.search}</div>;
}

function renderCallback(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard-page" />} />
        <Route path="/login" element={<LoginLocation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it("loads the current user with the OAuth token and redirects to dashboard", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: user });
    renderCallback("/auth/callback?token=oauth-token");

    expect(screen.getByTestId("auth-callback-page")).toBeInTheDocument();
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/users/me", {
        headers: { Authorization: "Bearer oauth-token" },
      }),
    );
    expect(useAuthStore.getState().accessToken).toBe("oauth-token");
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("redirects to login when the token is missing", async () => {
    renderCallback("/auth/callback");

    expect(await screen.findByTestId("login-location")).toHaveTextContent(
      "?error=oauth_failed",
    );
    expect(api.get).not.toHaveBeenCalled();
  });

  it("redirects to login when the token cannot load a user", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Invalid token"));
    renderCallback("/auth/callback?token=bad-token");

    expect(await screen.findByTestId("login-location")).toHaveTextContent(
      "?error=oauth_failed",
    );
    expect(useAuthStore.getState().user).toBeNull();
  });
});
