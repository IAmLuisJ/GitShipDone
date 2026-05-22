import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { AiPathwayPanel } from "./AiPathwayPanel";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("AiPathwayPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders markdown, copies content, and regenerates pathways", async () => {
    const user = userEvent.setup();
    const nextPathway = "1. Re-check scope\n2. Ship the smallest slice";

    vi.mocked(api.post).mockResolvedValue({ data: { pathway: nextPathway } });

    render(
      <AiPathwayPanel
        projectId="project-1"
        itemId="idea-1"
        existingPathway={"## Pathway\n\n1. Define scope"}
      />,
    );

    expect(screen.getByRole("heading", { name: "Pathway" })).toBeVisible();
    expect(screen.getByText("Define scope")).toBeVisible();

    expect(screen.getByRole("button", { name: "Copy pathway" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText("Re-check scope")).toBeVisible();
    expect(api.post).toHaveBeenCalledWith(
      "/projects/project-1/parking-lot/idea-1/ai-pathway",
    );
  });

  it("shows loading and error states when generation fails", async () => {
    const user = userEvent.setup();
    let rejectPathway: (error: Error) => void = () => {};
    vi.mocked(api.post).mockReturnValue(
      new Promise((_, reject) => {
        rejectPathway = reject;
      }),
    );

    render(<AiPathwayPanel projectId="project-1" itemId="idea-1" />);

    await user.click(screen.getByRole("button", { name: "Generate Pathway" }));
    expect(screen.getByText("Generating...")).toBeVisible();
    rejectPathway(new Error("AI unavailable"));
    expect(
      await screen.findByText("Could not generate pathway. Try again."),
    ).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generate Pathway" })).toBeEnabled(),
    );
  });
});
