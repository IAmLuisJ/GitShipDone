import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import ProjectDetail from "./ProjectDetail";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

const project = {
  id: "project-1",
  name: "Ship MVP",
  description: "Launch the first production-ready version.",
  type: "software",
  status: "active",
  progressAuto: 64,
  progressManual: null,
  pointsTotal: 420,
  level: "Sprout",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderProjectDetail(initialEntry = "/projects/project-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/projects/:id"
            element={
              <>
                <ProjectDetail />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockProjectRequests() {
  vi.mocked(api.get).mockImplementation((url) => {
    if (url === "/projects/project-1") {
      return Promise.resolve({ data: project });
    }

    if (url === "/projects/project-1/milestones") {
      return Promise.resolve({ data: [] });
    }

    if (url === "/projects/project-1/timeline?limit=5") {
      return Promise.resolve({ data: { events: [], total: 0, page: 1, limit: 5 } });
    }

    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

describe("ProjectDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the project and renders the header, actions, and tabs", async () => {
    const user = userEvent.setup();
    mockProjectRequests();
    renderProjectDetail();

    expect(await screen.findByRole("heading", { name: /ship mvp/i })).toBeVisible();
    expect(api.get).toHaveBeenCalledWith("/projects/project-1");
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getAllByText("Sprout")).not.toHaveLength(0);
    expect(screen.getAllByText("420 pts")).not.toHaveLength(0);
    expect(screen.getByText(/64% complete/i)).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(7);
    expect(screen.getByTestId("overview-tab")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/projects/project-1?tab=overview",
      ),
    );

    await user.click(screen.getByRole("button", { name: /project options/i }));
    expect(screen.getByRole("menuitem", { name: /edit project/i })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: /delete project/i })).toBeVisible();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: /ai pm/i }));
    expect(screen.getByRole("dialog", { name: /ai pm/i })).toBeInTheDocument();
  });

  it("syncs the active tab with the URL search param", async () => {
    const user = userEvent.setup();
    mockProjectRequests();
    renderProjectDetail("/projects/project-1?tab=milestones");

    expect(await screen.findByRole("heading", { name: /ship mvp/i })).toBeVisible();
    expect(screen.getByRole("tab", { name: /milestones/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("milestones-tab")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /todos/i }));

    expect(screen.getByTestId("todos-tab")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/projects/project-1?tab=todos",
    );
  });

  it("shows a not-found state when the project cannot be loaded", async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { status: 404 } });
    renderProjectDetail();

    expect(await screen.findByText(/project not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to projects/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
