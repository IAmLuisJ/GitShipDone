import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import type { Project } from "@/types/project";
import { ProjectProgressBar } from "./ProjectProgressBar";

vi.mock("@/lib/api", () => ({
  default: {
    patch: vi.fn(),
  },
}));

const project: Project = {
  id: "project-1",
  name: "Ship MVP",
  description: "Launch the first production-ready version.",
  type: "software",
  status: "active",
  progressAuto: 20,
  progressManual: null,
  pointsTotal: 420,
  level: "Sprout",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderProgress(currentProject: Project = project) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <ProjectProgressBar project={currentProject} />
    </QueryClientProvider>,
  );

  return { invalidateSpy };
}

describe("ProjectProgressBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.patch).mockResolvedValue({
      data: { progressAuto: 20, progressManual: 75 },
    });
  });

  it("shows auto progress when no manual override is set", () => {
    renderProgress();

    expect(screen.getByText("20% complete")).toBeInTheDocument();
    expect(screen.queryByText(/manual override active/i)).not.toBeInTheDocument();
  });

  it("sets a manual progress override inline", async () => {
    const user = userEvent.setup();
    const { invalidateSpy } = renderProgress();

    await user.click(screen.getByRole("button", { name: /edit progress/i }));
    await user.clear(screen.getByLabelText(/manual progress/i));
    await user.type(screen.getByLabelText(/manual progress/i), "75");
    await user.click(screen.getByRole("button", { name: /save progress/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/projects/project-1/progress", {
        progressManual: 75,
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project", "project-1"] });
  });

  it("shows and resets an active manual override", async () => {
    const user = userEvent.setup();
    const { invalidateSpy } = renderProgress({ ...project, progressManual: 75 });

    expect(screen.getByText("75% complete")).toBeInTheDocument();
    expect(screen.getByText(/manual override active/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset progress override/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/projects/project-1/progress", {
        progressManual: null,
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project", "project-1"] });
  });
});
