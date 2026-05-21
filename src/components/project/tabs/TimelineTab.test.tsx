import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { TimelineTab } from "./TimelineTab";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

const firstPageEvents = [
  {
    id: "event-new",
    type: "journal",
    payload: { title: "Launch notes" },
    createdAt: "2026-05-21T14:00:00.000Z",
  },
  {
    id: "event-milestone",
    type: "milestone_completed",
    payload: { milestoneName: "Beta shipped" },
    createdAt: "2026-05-20T14:00:00.000Z",
  },
];

const secondPageEvents = [
  {
    id: "event-progress",
    type: "progress_change",
    payload: { to: 80 },
    createdAt: "2026-05-19T14:00:00.000Z",
  },
];

function renderTimelineTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TimelineTab projectId="project-1" />
    </QueryClientProvider>,
  );
}

describe("TimelineTab", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-21T15:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a vertical newest-first timeline with relative and absolute timestamps", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { events: firstPageEvents, total: 2, page: 1, limit: 50 },
    });

    renderTimelineTab();

    expect(await screen.findByText("Journal: Launch notes")).toBeVisible();
    expect(screen.getByText("Completed milestone: Beta shipped")).toBeVisible();
    expect(screen.getByTestId("timeline-list")).toHaveClass("border-l");
    expect(screen.getAllByTestId("timeline-dot")).toHaveLength(2);
    expect(screen.getAllByTestId("timeline-event-icon")).toHaveLength(2);
    expect(screen.getByText("about 1 hour ago")).toHaveAttribute(
      "title",
      "May 21, 2026, 10:00 AM",
    );

    const summaries = screen.getAllByTestId("timeline-event-summary");
    expect(summaries.map((summary) => summary.textContent)).toEqual([
      "Journal: Launch notes",
      "Completed milestone: Beta shipped",
    ]);
    expect(api.get).toHaveBeenCalledWith("/projects/project-1/timeline?page=1&limit=50");
  });

  it("filters by event family and loads more timeline events", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    vi.mocked(api.get).mockImplementation((url) => {
      if (url === "/projects/project-1/timeline?page=1&limit=50") {
        return Promise.resolve({
          data: { events: firstPageEvents, total: 51, page: 1, limit: 50 },
        });
      }

      if (url === "/projects/project-1/timeline?page=2&limit=50") {
        return Promise.resolve({
          data: { events: secondPageEvents, total: 51, page: 2, limit: 50 },
        });
      }

      if (url === "/projects/project-1/timeline?page=1&limit=50&type=milestones") {
        return Promise.resolve({
          data: {
            events: [firstPageEvents[1]],
            total: 1,
            page: 1,
            limit: 50,
          },
        });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderTimelineTab();

    expect(await screen.findByText("Journal: Launch notes")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Milestones" }));

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        "/projects/project-1/timeline?page=1&limit=50&type=milestones",
      ),
    );
    expect(await screen.findByText("Completed milestone: Beta shipped")).toBeVisible();
    expect(screen.queryByText("Journal: Launch notes")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(await screen.findByText("Journal: Launch notes")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Progress changed to 80%")).toBeVisible();
  });

  it("shows an empty state when there are no events", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { events: [], total: 0, page: 1, limit: 50 },
    });

    renderTimelineTab();

    expect(await screen.findByText(/no timeline events yet/i)).toBeVisible();
  });
});
