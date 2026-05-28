import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectCardSkeleton } from "./ProjectCardSkeleton";

describe("ProjectCardSkeleton", () => {
  it("matches the project card loading shape", () => {
    render(<ProjectCardSkeleton />);

    expect(screen.getByTestId("project-card-skeleton")).toBeInTheDocument();
    expect(screen.getAllByTestId("project-card-skeleton-line").length).toBeGreaterThan(5);
  });
});
