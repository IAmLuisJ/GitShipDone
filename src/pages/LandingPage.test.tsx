import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LandingPage from "./LandingPage";
import { useAuthStore } from "@/stores/authStore";

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it("renders the public hero with auth CTAs", () => {
    renderLanding();

    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Build more\. Track effortlessly\. Ship with confidence\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get Started Free/i })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: /Sign In/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("renders six product feature highlights", () => {
    renderLanding();

    const featureHeadings = [
      "Timeline history",
      "GitHub changelogs",
      "AI PM copilot",
      "Points & levels",
      "Project sharing",
      "Parking lot ideas",
    ];

    for (const heading of featureHeadings) {
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    }
  });

  it("redirects authenticated users to the dashboard", () => {
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        aiProvider: null,
        createdAt: "2026-01-01",
      },
      accessToken: "token",
    });

    renderLanding();

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });
});
