import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { Project } from "@/types/project";
import { AiChatPanel } from "./AiChatPanel";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
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

const userWithAiKey = {
  id: "u1",
  email: "builder@example.com",
  name: "Builder",
  avatarUrl: null,
  aiProvider: "openai",
  createdAt: "2026-01-01T00:00:00.000Z",
  hasAiKey: true,
};

function renderPanel(hasAiKey = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  useAuthStore.setState({
    user: { ...userWithAiKey, hasAiKey },
    accessToken: "tok123",
  });

  function Harness() {
    const [open, setOpen] = useState(true);

    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open AI PM
        </button>
        <AiChatPanel open={open} onOpenChange={setOpen} project={project} />
      </>
    );
  }

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AiChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({
      data: { response: "Focus on the smallest launch risk first." },
    });
  });

  it("shows an AI key setup prompt when the user has no key", () => {
    renderPanel(false);

    expect(screen.getByText(/add an ai api key/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open settings/i })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("sends a message, shows loading, and renders the AI response", async () => {
    const user = userEvent.setup();
    let resolveResponse: (value: { data: { response: string } }) => void = () => {};
    vi.mocked(api.post).mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve;
      }),
    );
    renderPanel();

    await user.type(screen.getByLabelText(/message ai pm/i), "What should I do next?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("What should I do next?")).toBeInTheDocument();
    expect(screen.getByTestId("ai-typing-indicator")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/projects/project-1/ai/chat", {
      message: "What should I do next?",
    });

    resolveResponse({ data: { response: "Focus on the smallest launch risk first." } });

    expect(
      await screen.findByText("Focus on the smallest launch risk first."),
    ).toBeInTheDocument();
  });

  it("clears session messages after closing and reopening", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText(/message ai pm/i), "Keep this?");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText("Keep this?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close/i }));
    await user.click(screen.getByRole("button", { name: /open ai pm/i }));

    await waitFor(() =>
      expect(screen.queryByText("Keep this?")).not.toBeInTheDocument(),
    );
  });
});
