import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import ResetPasswordPage from "./ResetPasswordPage";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

function renderResetPassword(path = "/reset-password?token=valid-token") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an immediate error when the reset token is missing", () => {
    renderResetPassword("/reset-password");

    expect(screen.getByTestId("reset-password-page")).toBeInTheDocument();
    expect(screen.getByText(/reset token is missing/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new link/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("validates password length and matching confirmation", async () => {
    const user = userEvent.setup();
    renderResetPassword();

    await user.type(screen.getByLabelText(/^new password$/i), "short");
    await user.type(screen.getByLabelText(/confirm new password/i), "different");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/password must be at least 8 characters/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/passwords must match/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("submits the token and new password, then shows the login link", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    renderResetPassword();

    await user.type(screen.getByLabelText(/^new password$/i), "newPassword123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "newPassword123",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "valid-token",
        newPassword: "newPassword123",
      }),
    );
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows invalid token errors inline", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { error: "Invalid or expired token" } },
    });
    renderResetPassword("/reset-password?token=expired-token");

    await user.type(screen.getByLabelText(/^new password$/i), "newPassword123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "newPassword123",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByText(/invalid or expired token/i)).toBeInTheDocument();
  });
});
