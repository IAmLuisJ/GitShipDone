import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { useAuthStore, type User } from "@/stores/authStore";
import { AiSettingsForm } from "./AiSettingsForm";

const { toastSuccessMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: {
    patch: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
  },
}));

const user: User = {
  id: "user-1",
  email: "luis@example.com",
  name: "Luis Juarez",
  avatarUrl: null,
  aiProvider: "openai",
  createdAt: "2026-01-01T00:00:00.000Z",
  emailNotificationsEnabled: true,
  githubConnected: false,
  hasAiKey: true,
  hasPassword: true,
};

function renderForm(currentUser: User = user) {
  useAuthStore.setState({ user: currentUser, accessToken: "token" });
  render(<AiSettingsForm />);
}

describe("AiSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(api.patch).mockResolvedValue({ data: { provider: "openai" } });
  });

  it("shows provider choices and saved key indicator", () => {
    renderForm();

    expect(screen.getAllByText("OpenAI (GPT-4o)").length).toBeGreaterThan(0);
    expect(screen.getByText("Key saved (••••••••)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update key/i })).toBeDisabled();
  });

  it("toggles API key visibility", async () => {
    const userEventApi = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText(/api key/i);
    expect(input).toHaveAttribute("type", "password");

    await userEventApi.click(screen.getByRole("button", { name: /show key/i }));
    expect(input).toHaveAttribute("type", "text");

    await userEventApi.click(screen.getByRole("button", { name: /hide key/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("saves AI settings and syncs auth state", async () => {
    const userEventApi = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: { provider: "anthropic" } });
    renderForm({ ...user, aiProvider: "anthropic", hasAiKey: false });

    await userEventApi.type(screen.getByLabelText(/api key/i), "sk-ant-test-key");
    await userEventApi.click(
      screen.getByRole("button", { name: /save ai settings/i }),
    );

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/users/me/ai-settings", {
        provider: "anthropic",
        apiKey: "sk-ant-test-key",
      }),
    );
    expect(useAuthStore.getState().user).toMatchObject({
      aiProvider: "anthropic",
      hasAiKey: true,
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("AI settings saved!");
  });

  it("shows an error if save fails", async () => {
    const userEventApi = userEvent.setup();
    vi.mocked(api.patch).mockRejectedValue({
      response: { data: { error: "Invalid API key" } },
    });
    renderForm({ ...user, hasAiKey: false });

    await userEventApi.type(screen.getByLabelText(/api key/i), "bad-key-value");
    await userEventApi.click(
      screen.getByRole("button", { name: /save ai settings/i }),
    );

    expect(await screen.findByText("Invalid API key")).toBeInTheDocument();
  });
});
