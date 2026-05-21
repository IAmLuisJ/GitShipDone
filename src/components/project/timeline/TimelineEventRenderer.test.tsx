import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TimelineEvent } from "@/components/project/timelineEvent";
import { TimelineEventRenderer } from "./TimelineEventRenderer";

function renderEvent(event: TimelineEvent) {
  render(<TimelineEventRenderer event={event} />);
}

describe("TimelineEventRenderer", () => {
  it("renders journal events with title and mood", () => {
    renderEvent({
      id: "event-1",
      type: "journal",
      payload: { title: "Launch notes", mood: "win" },
      createdAt: "2026-05-21T14:00:00.000Z",
    });

    expect(screen.getByText("Journal update")).toBeVisible();
    expect(screen.getByText("Launch notes")).toBeVisible();
    expect(screen.getByText("Win")).toBeVisible();
    expect(screen.getByTestId("timeline-renderer-icon")).toHaveClass("text-blue-500");
  });

  it("renders milestone completion events with points", () => {
    renderEvent({
      id: "event-2",
      type: "milestone_completed",
      payload: { milestoneName: "Beta shipped", points: 50 },
      createdAt: "2026-05-21T14:00:00.000Z",
    });

    expect(screen.getByText("Milestone completed")).toBeVisible();
    expect(screen.getByText("Beta shipped")).toBeVisible();
    expect(screen.getByText("+50 pts")).toBeVisible();
    expect(screen.getByTestId("timeline-renderer-icon")).toHaveClass("text-yellow-500");
  });

  it("renders GitHub commit and release events", () => {
    render(
      <div>
        <TimelineEventRenderer
          event={{
            id: "event-3",
            type: "github_commit",
            payload: {
              sha: "1234567890abcdef",
              message: "Implement timeline rendering with details",
              authorName: "Ada",
            },
            createdAt: "2026-05-21T14:00:00.000Z",
          }}
        />
        <TimelineEventRenderer
          event={{
            id: "event-4",
            type: "github_release",
            payload: {
              tagName: "v1.2.0",
              name: "Public beta",
              aiSummary: "Includes the new project timeline.",
            },
            createdAt: "2026-05-21T14:00:00.000Z",
          }}
        />
      </div>,
    );

    expect(screen.getByText("Commit 1234567")).toBeVisible();
    expect(screen.getByText("Implement timeline rendering with details")).toHaveClass(
      "truncate",
    );
    expect(screen.getByText("Ada")).toBeVisible();
    expect(screen.getByText("Release v1.2.0")).toBeVisible();
    expect(screen.getByText("Public beta")).toBeVisible();
    expect(screen.getByText("Includes the new project timeline.")).toBeVisible();
    expect(screen.getByTestId("timeline-event-github_commit")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-event-github_release")).toBeInTheDocument();
  });

  it("renders todo, progress, points, and status events", () => {
    render(
      <div>
        <TimelineEventRenderer
          event={{
            id: "event-5",
            type: "todo_batch",
            payload: { completed: 3, total: 5, summary: "Finished launch checklist" },
            createdAt: "2026-05-21T14:00:00.000Z",
          }}
        />
        <TimelineEventRenderer
          event={{
            id: "event-6",
            type: "progress_change",
            payload: { from: 20, to: 80, isManual: true },
            createdAt: "2026-05-21T14:00:00.000Z",
          }}
        />
        <TimelineEventRenderer
          event={{
            id: "event-7",
            type: "points_change",
            payload: { delta: -10, reason: "Manual correction", newTotal: 410 },
            createdAt: "2026-05-21T14:00:00.000Z",
          }}
        />
        <TimelineEventRenderer
          event={{
            id: "event-8",
            type: "status_change",
            payload: { from: "active", to: "completed" },
            createdAt: "2026-05-21T14:00:00.000Z",
          }}
        />
      </div>,
    );

    expect(screen.getByText("Todo batch")).toBeVisible();
    expect(screen.getByText("3 of 5 completed")).toBeVisible();
    expect(screen.getByText("20% -> 80%")).toBeVisible();
    expect(screen.getByText("Manual override")).toBeVisible();
    expect(screen.getByText("-10 pts")).toBeVisible();
    expect(screen.getByText("Manual correction")).toBeVisible();
    expect(screen.getByText("Active -> Completed")).toBeVisible();
  });
});
