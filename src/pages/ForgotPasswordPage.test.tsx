import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import ForgotPasswordPage from "./ForgotPasswordPage";

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

const successMessage = "If that email exists, a reset link has been sent.";

function renderForgotPassword() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the email field and login link", () => {
    renderForgotPassword();

    expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("posts the email and shows the privacy-safe success message", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    renderForgotPassword();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", {
      email: "test@example.com",
    });
    expect(await screen.findByText(successMessage)).toBeInTheDocument();
  });

  it("shows the same message when the request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue(new Error("Unknown email"));
    renderForgotPassword();

    await user.type(screen.getByLabelText(/email/i), "unknown@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(successMessage)).toBeInTheDocument();
  });

  it("shows a loading state while submitting", async () => {
    const user = userEvent.setup();
    let resolveRequest: (value: { data: Record<string, never> }) => void;
    vi.mocked(api.post).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderForgotPassword();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    resolveRequest!({ data: {} });
    expect(await screen.findByText(successMessage)).toBeInTheDocument();
  });
});
