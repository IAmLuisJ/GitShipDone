import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AppLayout from "./AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockProjects = [
  {
    id: "project-1",
    name: "Launchpad",
    type: "software",
  },
  {
    id: "project-2",
    name: "Studio Notes",
    type: "content",
  },
];

function renderLayout(initialPath = "/dashboard") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              path="/dashboard"
              element={<div data-testid="dashboard-page">Dashboard</div>}
            />
            <Route
              path="/projects/:id"
              element={<div data-testid="project-detail-page">Project</div>}
            />
            <Route
              path="/settings"
              element={<div data-testid="settings-page">Settings</div>}
            />
          </Route>
          <Route path="/login" element={<div data-testid="login-page" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === "/projects") {
        return Promise.resolve({ data: mockProjects });
      }
      if (url === "/notifications?unreadOnly=false") {
        return Promise.resolve({ data: { notifications: [], unreadCount: 0 } });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Luis Juarez",
        avatarUrl: null,
        aiProvider: null,
        createdAt: "2026-01-01",
      },
      accessToken: "token",
    });
  });

  it("renders authenticated content inside the global layout", async () => {
    renderLayout();

    expect(screen.getByTestId("mobile-shell-header")).toHaveClass("md:hidden");
    expect(screen.getByTestId("app-main")).toHaveClass("pt-16", "md:pt-6");
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /GitShipDone/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /theme:/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByRole("link", { name: /Launchpad/i })).toHaveTextContent(
      /software/i,
    );
  });

  it("collapses the desktop sidebar to icon-only navigation", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(
      screen.getByRole("button", { name: /collapse sidebar/i }),
    );

    expect(screen.getByTestId("app-sidebar")).toHaveAttribute(
      "data-collapsed",
      "true",
    );
  });

  it("marks project routes active in the sidebar", async () => {
    renderLayout("/projects/project-2");

    expect(
      await screen.findByRole("link", { name: /Studio Notes/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("logs out from the sidebar user menu", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("button", { name: /Luis Juarez/i }));
    await user.click(await screen.findByRole("menuitem", { name: /logout/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/logout"));
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });
});
