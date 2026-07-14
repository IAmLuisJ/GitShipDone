import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OAuthButtons } from "./OAuthButtons";

describe("OAuthButtons", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders Google and GitHub login links when the oauth feature is on", () => {
    render(<OAuthButtons />);

    expect(screen.getByRole("link", { name: /continue with google/i })).toHaveAttribute(
      "href",
      "/api/auth/google",
    );
    expect(screen.getByRole("link", { name: /continue with github/i })).toHaveAttribute(
      "href",
      "/api/auth/github",
    );
  });

  it("renders nothing when the oauth feature is off", () => {
    vi.stubEnv("VITE_FEATURE_OAUTH", "false");

    const { container } = render(<OAuthButtons />);

    expect(container).toBeEmptyDOMElement();
  });
});
