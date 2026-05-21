import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import RegisterPage from "./RegisterPage";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it("renders name, email, password, OAuth buttons, and login link", () => {
    renderRegister();

    expect(screen.getByTestId("register-page")).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /continue with google/i }),
    ).toHaveAttribute("href", "/api/auth/google");
    expect(
      screen.getByRole("link", { name: /continue with github/i }),
    ).toHaveAttribute("href", "/api/auth/github");
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows inline validation errors", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(
      screen.getByText(/password must be at least 8 characters/i),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("displays API errors below the form", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { error: "Email already registered" } },
    });
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "Test User");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/email already registered/i),
    ).toBeInTheDocument();
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
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "Test User");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/auth/register", {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
    );
    expect(useAuthStore.getState().accessToken).toBe("token");
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });
});
