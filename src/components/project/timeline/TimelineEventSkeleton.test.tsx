import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimelineEventSkeleton } from "./TimelineEventSkeleton";

describe("TimelineEventSkeleton", () => {
  it("matches the timeline event row shape", () => {
    render(<TimelineEventSkeleton />);

    expect(screen.getByTestId("timeline-event-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-event-skeleton-dot")).toBeInTheDocument();
    expect(screen.getAllByTestId("timeline-event-skeleton-line")).toHaveLength(3);
  });
});
