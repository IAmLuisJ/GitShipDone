import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import Dashboard from "./Dashboard";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const project = {
  id: "project-1",
  name: "Ship MVP",
  description: "Launch the first version",
  type: "software",
  status: "active",
  progressAuto: 42,
  progressManual: null,
  pointsTotal: 120,
  level: "Harbor",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/projects/:id"
            element={<div data-testid="project-detail-page" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeletons while projects load", () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => undefined));

    renderDashboard();

    expect(screen.getAllByTestId("project-card-skeleton")).toHaveLength(6);
  });

  it("renders project cards in a responsive grid", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [project] });

    renderDashboard();

    expect(await screen.findByRole("heading", { name: /projects/i })).toBeVisible();
    expect(await screen.findByRole("link", { name: /ship mvp/i })).toHaveAttribute(
      "href",
      "/projects/project-1",
    );
    expect(screen.getByText(/software/i)).toBeInTheDocument();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });

  it("opens the create modal from the empty state", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    renderDashboard();

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create your first project/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
  });

  it("opens the create flow from the header", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    renderDashboard();

    await user.click(await screen.findByRole("button", { name: /new project/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });
});
