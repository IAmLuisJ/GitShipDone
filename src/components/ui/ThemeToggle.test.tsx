import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { themeStorageKey } from "@/hooks/useTheme";
import { ThemeToggle } from "./ThemeToggle";

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      matches,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  });
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    mockMatchMedia();
  });

  it("cycles theme preference and persists the choice", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = screen.getByRole("button", { name: /theme: system/i });
    await user.click(toggle);

    expect(screen.getByRole("button", { name: /theme: light/i })).toBeInTheDocument();
    expect(window.localStorage.getItem(themeStorageKey)).toBe("light");

    await user.click(screen.getByRole("button", { name: /theme: light/i }));

    expect(screen.getByRole("button", { name: /theme: dark/i })).toBeInTheDocument();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("can hide visible copy when collapsed", () => {
    render(<ThemeToggle collapsed />);

    expect(screen.getByText("System theme")).toHaveClass("sr-only");
  });
});
