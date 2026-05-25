import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import type { Project } from "@/types/project";
import { ProjectSettingsTab } from "./ProjectSettingsTab";

const { toastSuccessMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: {
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
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

function renderSettings(currentProject: Project = project) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  queryClient.setQueryData(["project", currentProject.id], currentProject);
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${currentProject.id}?tab=settings`]}>
        <Routes>
          <Route
            path="/projects/:id"
            element={<ProjectSettingsTab project={currentProject} />}
          />
          <Route path="/dashboard" element={<h1>Dashboard route</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { invalidateSpy, queryClient };
}

describe("ProjectSettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.patch).mockResolvedValue({ data: project });
    vi.mocked(api.delete).mockResolvedValue({ data: { message: "Project deleted" } });
  });

  it("saves general settings and refreshes project data", async () => {
    const user = userEvent.setup();
    const updatedProject = {
      ...project,
      name: "Ship production",
      description: "Launch with real users.",
      type: "content" as const,
      status: "on_hold" as const,
    };
    vi.mocked(api.patch).mockResolvedValue({ data: updatedProject });
    const { invalidateSpy, queryClient } = renderSettings();

    expect(screen.getByLabelText(/project name/i)).toHaveValue("Ship MVP");
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      "Launch the first production-ready version.",
    );

    await user.clear(screen.getByLabelText(/project name/i));
    await user.type(screen.getByLabelText(/project name/i), updatedProject.name);
    await user.clear(screen.getByLabelText(/description/i));
    await user.type(screen.getByLabelText(/description/i), updatedProject.description);
    await user.selectOptions(screen.getByLabelText(/project type/i), "content");
    await user.selectOptions(screen.getByLabelText(/project status/i), "on_hold");
    await user.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/projects/project-1", {
        description: updatedProject.description,
        name: updatedProject.name,
        status: updatedProject.status,
        type: updatedProject.type,
      }),
    );
    expect(queryClient.getQueryData(["project", "project-1"])).toEqual(updatedProject);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project", "project-1"] });
    expect(toastSuccessMock).toHaveBeenCalledWith("Project settings saved");
  });

  it("renders delegated sharing and GitHub sections", () => {
    renderSettings();

    expect(screen.getByRole("heading", { name: /sharing/i })).toBeInTheDocument();
    expect(screen.getByText(/sharing controls/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /github/i })).toBeInTheDocument();
    expect(screen.getByText(/repository connection/i)).toBeInTheDocument();
  });

  it("requires the project name before deleting and navigating away", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /^delete project$/i }));
    const confirmButton = screen.getByRole("button", { name: /delete this project/i });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/type ship mvp to confirm/i), "Ship MV");
    expect(confirmButton).toBeDisabled();

    await user.clear(screen.getByLabelText(/type ship mvp to confirm/i));
    await user.type(screen.getByLabelText(/type ship mvp to confirm/i), "Ship MVP");
    await user.click(confirmButton);

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/projects/project-1"));
    expect(await screen.findByRole("heading", { name: /dashboard route/i })).toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledWith("Project deleted");
  });
});
