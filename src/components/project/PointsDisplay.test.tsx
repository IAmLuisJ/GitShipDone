import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import type { Project } from "@/types/project";
import { PointsDisplay } from "./PointsDisplay";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

const project: Project = {
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

function renderPoints(currentProject: Project = project) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <PointsDisplay project={currentProject} />
    </QueryClientProvider>,
  );
}

describe("PointsDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: "log-1",
          delta: 10,
          reason: "Completed todo: Wire OAuth",
          source: "todo",
          createdAt: "2026-05-24T12:00:00.000Z",
        },
        {
          id: "log-2",
          delta: -5,
          reason: "Unchecked todo: Polish copy",
          source: "todo",
          createdAt: "2026-05-24T11:00:00.000Z",
        },
      ],
    });
  });

  it("shows a colored level badge and points total", () => {
    renderPoints();

    expect(screen.getByText("Sprout")).toBeInTheDocument();
    expect(screen.getByText("420 pts")).toBeInTheDocument();
    expect(screen.getByTestId("level-badge")).toHaveClass("bg-emerald-100");
  });

  it("loads the last five points transactions for the tooltip", async () => {
    const user = userEvent.setup();
    renderPoints();

    await user.hover(screen.getByRole("button", { name: /points history/i }));

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/projects/project-1/points-log"),
    );
    const visibleReasons = await screen.findAllByText(
      "Completed todo: Wire OAuth",
    );
    expect(visibleReasons.length).toBeGreaterThan(0);
    expect(screen.getAllByText("+10")[0]).toHaveClass("text-emerald-500");
    expect(screen.getAllByText("-5")[0]).toHaveClass("text-rose-500");
  });
});
