import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { Project } from "@/types/project";
import { GithubConnectPanel } from "./GithubConnectPanel";

const { toastSuccessMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
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
  githubCommitCount: 0,
  githubRepoId: null,
  githubRepoName: null,
};

const githubUser = {
  id: "u1",
  email: "builder@example.com",
  name: "Builder",
  avatarUrl: null,
  aiProvider: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  githubConnected: true,
};

function renderPanel(currentProject: Project = project) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <GithubConnectPanel project={currentProject} />
    </QueryClientProvider>,
  );

  return { invalidateSpy };
}

describe("GithubConnectPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { ...githubUser }, accessToken: "tok123" });
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: 123,
          fullName: "octocat/hello-world",
          htmlUrl: "https://github.com/octocat/hello-world",
          name: "hello-world",
          owner: "octocat",
          private: false,
        },
      ],
    });
    vi.mocked(api.post).mockResolvedValue({
      data: { repoName: "octocat/hello-world", importStatus: "importing" },
    });
    vi.mocked(api.delete).mockResolvedValue({
      data: { message: "GitHub repo disconnected" },
    });
  });

  it("links to the GitHub repo OAuth flow when the account is not connected", () => {
    useAuthStore.setState({
      user: { ...githubUser, githubConnected: false },
      accessToken: "tok123",
    });

    renderPanel();

    expect(
      screen.getByRole("link", { name: /connect github account/i }),
    ).toHaveAttribute("href", "/api/auth/github/repo");
  });

  it("loads repos and links the selected repo to the project", async () => {
    const user = userEvent.setup();
    const { invalidateSpy } = renderPanel();

    expect(await screen.findByText("octocat/hello-world")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/repository/i), "octocat/hello-world");
    await user.click(screen.getByRole("button", { name: /link repository/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/projects/project-1/github/connect", {
        repoName: "hello-world",
        repoOwner: "octocat",
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project", "project-1"] });
    expect(toastSuccessMock).toHaveBeenCalledWith("GitHub repository connected");
  });

  it("shows the connected repo, imported commit count, and disconnects", async () => {
    const user = userEvent.setup();
    const { invalidateSpy } = renderPanel({
      ...project,
      githubCommitCount: 12,
      githubRepoId: "123",
      githubRepoName: "octocat/hello-world",
    });

    expect(
      screen.getByRole("link", { name: /octocat\/hello-world/i }),
    ).toHaveAttribute("href", "https://github.com/octocat/hello-world");
    expect(screen.getByText(/12 commits imported/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/projects/project-1/github/disconnect"),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project", "project-1"] });
    expect(toastSuccessMock).toHaveBeenCalledWith("GitHub repository disconnected");
  });
});
