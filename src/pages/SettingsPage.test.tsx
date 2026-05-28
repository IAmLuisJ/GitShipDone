import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { useAuthStore, type User } from "@/stores/authStore";
import SettingsPage from "./SettingsPage";

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
  avatarUrl: "https://example.com/avatar.png",
  aiProvider: "openai",
  createdAt: "2026-01-01T00:00:00.000Z",
  emailNotificationsEnabled: true,
  githubConnected: false,
  hasAiKey: true,
  hasPassword: true,
};

function renderSettings(currentUser: User = user) {
  useAuthStore.setState({ user: currentUser, accessToken: "token" });
  render(<SettingsPage />);
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(api.patch).mockResolvedValue({ data: user });
  });

  it("renders settings sections", () => {
    renderSettings();

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("saves profile updates and syncs auth state", async () => {
    const userEventApi = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({
      data: { ...user, name: "Luis J", avatarUrl: "https://example.com/new.png" },
    });
    renderSettings();

    await userEventApi.clear(screen.getByLabelText(/^name$/i));
    await userEventApi.type(screen.getByLabelText(/^name$/i), "Luis J");
    await userEventApi.clear(screen.getByLabelText(/avatar url/i));
    await userEventApi.type(
      screen.getByLabelText(/avatar url/i),
      "https://example.com/new.png",
    );
    await userEventApi.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/users/me", {
        name: "Luis J",
        avatarUrl: "https://example.com/new.png",
      }),
    );
    expect(useAuthStore.getState().user?.name).toBe("Luis J");
    expect(toastSuccessMock).toHaveBeenCalledWith("Profile saved");
  });

  it("hides password fields for OAuth-only accounts", () => {
    renderSettings({ ...user, hasPassword: false });

    expect(
      screen.getByText(/password login is not available for oauth accounts/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
  });

  it("updates password and notification preferences", async () => {
    const userEventApi = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: { ...user, emailNotificationsEnabled: false } });
    renderSettings();

    await userEventApi.type(screen.getByLabelText(/current password/i), "oldpass123");
    await userEventApi.type(screen.getByLabelText(/new password/i), "newpass123");
    await userEventApi.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/users/me/password", {
        currentPassword: "oldpass123",
        newPassword: "newpass123",
      }),
    );

    await userEventApi.click(screen.getByLabelText(/email notifications/i));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/users/me", {
        emailNotificationsEnabled: false,
      }),
    );
  });

  it("opens and cancels the delete account dialog", async () => {
    const userEventApi = userEvent.setup();
    renderSettings();

    await userEventApi.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEventApi.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
