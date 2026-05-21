import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { useInitAuth } from "@/hooks/useInitAuth";
import App from "./App";

vi.mock("@/hooks/useInitAuth", () => ({
  useInitAuth: vi.fn(),
}));

describe("App", () => {
  it("shows a full-page loading state during auth initialization", () => {
    vi.mocked(useInitAuth).mockReturnValue({ isLoading: true });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("auth-init-loading")).toBeInTheDocument();
  });
});
