import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import type { Project } from "@/types/project";
import { getStatusVariant, getTypeColor } from "./ProjectCard.utils";
import { ProjectCard } from "./ProjectCard";

const project: Project = {
  id: "project-1",
  name: "Ship MVP",
  description: "Launch the first version",
  type: "software",
  status: "on_hold",
  progressAuto: 10,
  progressManual: 73,
  pointsTotal: 120,
  level: "Harbor",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderCard(cardProject = project) {
  return render(
    <MemoryRouter>
      <ProjectCard project={cardProject} />
    </MemoryRouter>,
  );
}

describe("ProjectCard", () => {
  it("renders a clickable project summary with manual progress", () => {
    renderCard();

    expect(screen.getByRole("link", { name: /ship mvp/i })).toHaveAttribute(
      "href",
      "/projects/project-1",
    );
    expect(screen.getByRole("heading", { name: /ship mvp/i })).toBeInTheDocument();
    expect(screen.getByText(/software/i)).toHaveClass("bg-blue-100");
    expect(screen.getByText(/on hold/i)).toBeInTheDocument();
    expect(screen.getByText(/73%/)).toBeInTheDocument();
    expect(screen.getByText(/120 pts/i)).toBeInTheDocument();
    expect(screen.getByText(/harbor/i)).toBeInTheDocument();
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });

  it("falls back to auto progress when manual progress is not set", () => {
    renderCard({ ...project, progressManual: null, progressAuto: 38 });

    expect(screen.getByText(/38%/)).toBeInTheDocument();
  });

  it("maps type colors and status variants", () => {
    expect(getTypeColor("software")).toContain("bg-blue");
    expect(getTypeColor("design")).toContain("bg-purple");
    expect(getTypeColor("physical")).toContain("bg-orange");
    expect(getTypeColor("content")).toContain("bg-green");
    expect(getTypeColor("learning")).toContain("bg-yellow");
    expect(getTypeColor("other")).toContain("bg-gray");

    expect(getStatusVariant("active")).toBe("default");
    expect(getStatusVariant("on_hold")).toBe("secondary");
    expect(getStatusVariant("completed")).toBe("outline");
    expect(getStatusVariant("archived")).toBe("destructive");
  });
});
