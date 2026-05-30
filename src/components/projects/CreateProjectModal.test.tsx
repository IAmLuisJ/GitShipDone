import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { CreateProjectModal } from "./CreateProjectModal";
import { PREDEFINED_SOFTWARE_MILESTONES } from "./milestoneTemplates";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

const createdProject = {
  id: "project-123",
  name: "Launch Pad",
  description: "A careful v1 launch",
  type: "software",
  status: "active",
  progressAuto: 0,
  progressManual: null,
  pointsTotal: 0,
  level: "Seed",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const onOpenChange = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <CreateProjectModal
                open
                onOpenChange={onOpenChange}
              />
            }
          />
          <Route
            path="/projects/:id"
            element={<div data-testid="project-detail-page" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { invalidateSpy, onOpenChange };
}

describe("CreateProjectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("walks through the software wizard and submits milestone templates", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: createdProject });
    const { invalidateSpy, onOpenChange } = renderModal();

    expect(screen.getByRole("dialog")).toHaveClass(
      "h-dvh",
      "max-w-full",
      "rounded-none",
    );
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^software$/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/project name/i), "Launch Pad");
    await user.click(screen.getByRole("button", { name: /^software$/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    await user.type(
      screen.getByLabelText(/vision \/ description/i),
      "A careful v1 launch",
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
    expect(
      screen.getByRole("checkbox", { name: /set up repository and ci\/cd/i }),
    ).toHaveAttribute("aria-checked", "true");

    await user.click(
      screen.getByRole("checkbox", { name: /configure authentication/i }),
    );
    await user.click(screen.getByRole("checkbox", { name: /write tests/i }));
    await user.click(screen.getByRole("button", { name: /create project/i }));

    const expectedTemplates = PREDEFINED_SOFTWARE_MILESTONES.map(
      (milestone) => milestone.name,
    ).filter(
      (template) =>
        template !== "Configure authentication" && template !== "Write tests",
    );

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/projects", {
        name: "Launch Pad",
        description: "A careful v1 launch",
        type: "software",
        milestoneTemplates: expectedTemplates,
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(await screen.findByTestId("project-detail-page")).toBeInTheDocument();
  });

  it("supports back navigation between steps", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/project name/i), "Learning Plan");
    await user.click(screen.getByRole("button", { name: /^learning$/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByLabelText(/vision \/ description/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/project name/i)).toHaveValue("Learning Plan");
    expect(screen.getByRole("button", { name: /^learning$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a ready confirmation instead of templates for non-software projects", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/project name/i), "Learning Plan");
    await user.click(screen.getByRole("button", { name: /^learning$/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/ready to create!/i)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
