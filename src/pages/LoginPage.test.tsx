import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import LoginPage from "./LoginPage";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it("renders email, password, OAuth buttons, and auth links", () => {
    renderLogin();

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /continue with google/i }),
    ).toHaveAttribute("href", "/api/auth/google");
    expect(
      screen.getByRole("link", { name: /continue with github/i }),
    ).toHaveAttribute("href", "/api/auth/github");
    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("shows inline validation errors", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("displays API errors below the form", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { error: "Invalid credentials" } },
    });
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it("stores auth state and redirects to dashboard on success", async () => {
    const user = userEvent.setup();
    const authUser = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: null,
      aiProvider: null,
      createdAt: "2026-01-01",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { user: authUser, accessToken: "token" },
    });
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password123",
      }),
    );
    expect(useAuthStore.getState().accessToken).toBe("token");
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });
});
