import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import type { Project } from "@/types/project";
import { SharingPanel } from "./SharingPanel";

const { toastSuccessMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: {
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
  isPublic: false,
  shareToken: null,
};

function renderSharing(currentProject: Project = project) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <SharingPanel project={currentProject} />
    </QueryClientProvider>,
  );

  return { invalidateSpy };
}

describe("SharingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({
      data: {
        shareToken: "share-token-1",
        shareUrl: "http://localhost:3000/share/share-token-1",
      },
    });
  });

  it("enables public sharing from the switch and shows the share URL", async () => {
    const user = userEvent.setup();
    const { invalidateSpy } = renderSharing();

    await user.click(screen.getByRole("switch", { name: /public sharing/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/projects/project-1/share/enable"),
    );
    expect(
      screen.getByDisplayValue("http://localhost:3000/share/share-token-1"),
    ).toBeInTheDocument();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project", "project-1"] });
    expect(toastSuccessMock).toHaveBeenCalledWith("Sharing enabled");
  });

  it("copies the current public share URL", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    renderSharing({ ...project, isPublic: true, shareToken: "existing-token" });

    await user.click(screen.getByRole("button", { name: /copy share url/i }));

    expect(writeTextMock).toHaveBeenCalledWith(
      `${window.location.origin}/share/existing-token`,
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("Copied!");
  });

  it("confirms revoke before disabling the public link", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { message: "Share link revoked" } });
    const { invalidateSpy } = renderSharing({
      ...project,
      isPublic: true,
      shareToken: "existing-token",
    });

    await user.click(screen.getByRole("button", { name: /revoke link/i }));
    await user.click(screen.getByRole("button", { name: /revoke public link/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/projects/project-1/share/revoke"),
    );
    expect(screen.queryByDisplayValue(/existing-token/i)).not.toBeInTheDocument();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["project", "project-1"] });
    expect(toastSuccessMock).toHaveBeenCalledWith("Share link revoked");
  });
});
