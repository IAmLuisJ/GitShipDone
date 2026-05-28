import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import PublicSharePage from "./PublicSharePage";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

const sharePayload = {
  project: {
    id: "project-1",
    name: "Ship MVP",
    description: "A public launch plan.",
    type: "software",
    status: "active",
    progressAuto: 64,
    progressManual: null,
    pointsTotal: 420,
    level: "Sprout",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  milestones: [
    {
      id: "milestone-1",
      name: "Beta launch",
      status: "completed",
      dueDate: "2026-06-01T00:00:00.000Z",
      sortOrder: 1,
    },
  ],
  todos: [
    {
      id: "todo-1",
      title: "Write docs",
      isCompleted: true,
      isUrgent: false,
      dueDate: null,
      sortOrder: 1,
    },
  ],
  journalEntries: [
    {
      id: "journal-1",
      title: "Day 1",
      body: "Started building",
      createdAt: "2026-05-24T12:00:00.000Z",
    },
  ],
  timeline: [
    {
      id: "timeline-1",
      type: "milestone_completed",
      payload: { milestoneName: "Beta launch", points: 50 },
      createdAt: "2026-05-24T12:00:00.000Z",
    },
  ],
};

function renderShare(path = "/share/public-token") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/share/:token" element={<PublicSharePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PublicSharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: sharePayload });
  });

  it("renders the public project without private controls", async () => {
    renderShare();

    expect(await screen.findByText("Ship MVP")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/share/public-token");
    expect(screen.getByText("software")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("Sprout")).toBeInTheDocument();
    expect(screen.getByText("420 pts")).toBeInTheDocument();
    expect(screen.getByText("64% complete")).toBeInTheDocument();
    expect(screen.getAllByText("Beta launch").length).toBeGreaterThan(0);
    expect(screen.getByText("Write docs")).toBeInTheDocument();
    expect(screen.getByText("Day 1")).toBeInTheDocument();
    expect(screen.getByText("Started building")).toBeInTheDocument();
    expect(screen.getByText(/milestone completed/i)).toBeInTheDocument();
    expect(screen.getByText("Powered by GitShipDone")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /track your projects/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByRole("button", { name: /ai pm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("shows not found for invalid or private share tokens", async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { status: 404 } });

    renderShare("/share/bad-token");

    await waitFor(() =>
      expect(screen.getByText(/project not found/i)).toBeInTheDocument(),
    );
  });
});
