import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import type { Project } from "@/types/project";
import { OverviewTab } from "./OverviewTab";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const project: Project = {
  id: "project-1",
  name: "Ship MVP",
  description: "Launch the first production-ready version.",
  type: "software",
  status: "active",
  progressAuto: 64,
  progressManual: 72,
  pointsTotal: 420,
  level: "Sprout",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const milestones = [
  { id: "m1", name: "Plan", status: "completed" },
  { id: "m2", name: "Build", status: "completed" },
  { id: "m3", name: "Launch", status: "pending" },
];

const initialEvents = [
  {
    id: "event-1",
    type: "journal",
    payload: { title: "First update" },
    createdAt: "2026-05-21T04:00:00.000Z",
  },
  {
    id: "event-2",
    type: "milestone_completed",
    payload: { milestoneName: "Plan" },
    createdAt: "2026-05-20T04:00:00.000Z",
  },
];

function renderOverview(
  currentProject: Project = project,
  onSelectTab = vi.fn(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <OverviewTab project={currentProject} onSelectTab={onSelectTab} />
    </QueryClientProvider>,
  );

  return { onSelectTab, queryClient };
}

describe("OverviewTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === "/projects/project-1/milestones") {
        return Promise.resolve({ data: milestones });
      }

      if (url === "/projects/project-1/timeline?limit=5") {
        return Promise.resolve({
          data: { events: initialEvents, total: 2, page: 1, limit: 5 },
        });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
  });

  it("shows the vision, stats, milestone completion, and recent activity", async () => {
    renderOverview();

    expect(screen.getByText(project.description!)).toBeInTheDocument();
    expect(screen.getByText(/auto 64%/i)).toBeInTheDocument();
    expect(screen.getByText(/manual 72%/i)).toBeInTheDocument();
    expect(screen.getByText("420 pts")).toBeInTheDocument();
    expect(screen.getByText("Sprout")).toBeInTheDocument();
    expect(await screen.findByText(/2 of 3 completed/i)).toBeInTheDocument();
    expect(await screen.findByText(/journal: first update/i)).toBeInTheDocument();
    expect(screen.getByText(/completed milestone: plan/i)).toBeInTheDocument();
  });

  it("shows a placeholder when the project has no vision", () => {
    renderOverview({ ...project, description: null });

    expect(
      screen.getByText(/no vision statement yet\. add one to keep your project focused\./i),
    ).toBeInTheDocument();
  });

  it("edits the vision inline and updates cached project data", async () => {
    const user = userEvent.setup();
    const updatedProject = { ...project, description: "Focus on the beta launch." };
    vi.mocked(api.patch).mockResolvedValue({ data: updatedProject });
    const { queryClient } = renderOverview();

    await user.click(screen.getByRole("button", { name: /edit vision/i }));
    await user.clear(screen.getByLabelText(/vision statement/i));
    await user.type(screen.getByLabelText(/vision statement/i), updatedProject.description);
    await user.click(screen.getByRole("button", { name: /save vision/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/projects/project-1", {
        description: updatedProject.description,
      }),
    );
    expect(queryClient.getQueryData(["project", "project-1"])).toEqual(updatedProject);
  });

  it("opens quick actions for journal updates and todos", async () => {
    const user = userEvent.setup();
    let events = [...initialEvents];
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === "/projects/project-1/milestones") {
        return Promise.resolve({ data: milestones });
      }

      if (url === "/projects/project-1/timeline?limit=5") {
        return Promise.resolve({
          data: { events, total: events.length, page: 1, limit: 5 },
        });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    vi.mocked(api.post).mockImplementation(async () => {
      events = [
        {
          id: "event-3",
          type: "journal",
          payload: { title: "Blocked on deploy" },
          createdAt: "2026-05-21T05:00:00.000Z",
        },
        ...events,
      ];
      return { data: { id: "journal-1" } };
    });
    const { onSelectTab } = renderOverview();

    await user.click(screen.getByRole("button", { name: /log update/i }));
    await user.type(screen.getByLabelText(/update title/i), "Blocked on deploy");
    await user.type(screen.getByLabelText(/update body/i), "Need deployment keys.");
    await user.click(screen.getByRole("button", { name: /save update/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/projects/project-1/journal", {
        title: "Blocked on deploy",
        body: "Need deployment keys.",
      }),
    );
    expect(await screen.findByText(/journal: blocked on deploy/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add todo/i }));
    expect(onSelectTab).toHaveBeenCalledWith("todos");
  });
});
