import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { MilestonesTab } from "./MilestonesTab";

const { fireConfettiMock } = vi.hoisted(() => ({
  fireConfettiMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/hooks/useConfetti", () => ({
  fireConfetti: fireConfettiMock,
}));

const milestones = [
  {
    id: "m2",
    name: "Build beta",
    status: "in_progress",
    dueDate: "2026-06-05",
    sortOrder: 2,
  },
  {
    id: "m1",
    name: "Plan launch",
    status: "pending",
    dueDate: null,
    sortOrder: 1,
  },
  {
    id: "m3",
    name: "Launch v1",
    status: "completed",
    dueDate: null,
    sortOrder: 3,
  },
];

function renderMilestones() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MilestonesTab projectId="project-1" />
    </QueryClientProvider>,
  );

  return queryClient;
}

describe("MilestonesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: milestones });
    vi.mocked(api.post).mockResolvedValue({ data: milestones[0] });
    vi.mocked(api.patch).mockResolvedValue({ data: { milestones } });
    vi.mocked(api.delete).mockResolvedValue({ data: { message: "Milestone deleted" } });
  });

  it("lists milestones sorted by sort order with status, due date, and completion checkbox", async () => {
    renderMilestones();

    const items = await screen.findAllByTestId("milestone-item");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Plan launch"),
      expect.stringContaining("Build beta"),
      expect.stringContaining("Launch v1"),
    ]);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText(/due jun 5, 2026/i)).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("completes, creates, deletes, and reorders milestones through the API", async () => {
    const user = userEvent.setup();
    renderMilestones();

    await user.click(await screen.findByRole("checkbox", { name: /complete build beta/i }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/projects/project-1/milestones/m2/complete",
      ),
    );
    expect(fireConfettiMock).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText(/milestone name/i), "Write docs");
    await user.type(screen.getByLabelText(/due date/i), "2026-06-20");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/projects/project-1/milestones", {
        name: "Write docs",
        dueDate: "2026-06-20T00:00:00.000Z",
      }),
    );

    await user.click(screen.getByRole("button", { name: /delete plan launch/i }));
    await user.click(screen.getByRole("button", { name: /delete milestone/i }));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/projects/project-1/milestones/m1"),
    );

    await user.click(screen.getByRole("button", { name: /move build beta up/i }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/projects/project-1/milestones/reorder", {
        milestoneIds: ["m2", "m1", "m3"],
      }),
    );
  });

  it("shows an empty state when there are no milestones", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    renderMilestones();

    expect(await screen.findByText(/no milestones yet/i)).toBeInTheDocument();
  });
});
