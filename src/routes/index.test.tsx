import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import AppRoutes from "./index";
import { useAuthStore } from "@/stores/authStore";

function renderWithRouter(initialEntries: string[]) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppRoutes", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it("renders landing page at /", () => {
    renderWithRouter(["/"]);
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
  });

  it("renders login page at /login", () => {
    renderWithRouter(["/login"]);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("renders register page at /register", () => {
    renderWithRouter(["/register"]);
    expect(screen.getByTestId("register-page")).toBeInTheDocument();
  });

  it("renders forgot password at /forgot-password", () => {
    renderWithRouter(["/forgot-password"]);
    expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
  });

  it("renders reset password at /reset-password", () => {
    renderWithRouter(["/reset-password"]);
    expect(screen.getByTestId("reset-password-page")).toBeInTheDocument();
  });

  it("renders public share page at /share/:token", () => {
    renderWithRouter(["/share/abc123"]);
    expect(screen.getByTestId("public-share-page")).toBeInTheDocument();
  });

  it("redirects to /login for protected /dashboard when not authenticated", () => {
    renderWithRouter(["/dashboard"]);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("redirects to /login when only a token is present", () => {
    useAuthStore.setState({ user: null, accessToken: "tok123" });
    renderWithRouter(["/dashboard"]);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("renders dashboard when authenticated", () => {
    useAuthStore.setState({
      user: {
        id: "u1",
        email: "a@b.com",
        name: "Test",
        avatarUrl: null,
        aiProvider: null,
        createdAt: "2026-01-01",
      },
      accessToken: "tok123",
    });
    renderWithRouter(["/dashboard"]);
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("redirects to /login for protected /settings when not authenticated", () => {
    renderWithRouter(["/settings"]);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("renders settings when authenticated", () => {
    useAuthStore.setState({
      user: {
        id: "u1",
        email: "a@b.com",
        name: "Test",
        avatarUrl: null,
        aiProvider: null,
        createdAt: "2026-01-01",
      },
      accessToken: "tok123",
    });
    renderWithRouter(["/settings"]);
    expect(screen.getByTestId("settings-page")).toBeInTheDocument();
  });

  it("renders not found for unknown route", () => {
    renderWithRouter(["/unknown"]);
    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
  });
});
