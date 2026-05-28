import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { NotificationItem, type Notification } from "./NotificationItem";

vi.mock("@/lib/api", () => ({
  default: {
    patch: vi.fn(),
  },
}));

const notification: Notification = {
  id: "notification-1",
  type: "milestone_due",
  projectId: "project-1",
  projectName: "Launchpad",
  message: "Milestone Beta is due today",
  isRead: false,
  createdAt: "2026-05-28T12:00:00.000Z",
};

function renderItem(currentNotification: Notification = notification) {
  const onChanged = vi.fn();

  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <NotificationItem
              notification={currentNotification}
              onChanged={onChanged}
            />
          }
        />
        <Route
          path="/projects/:id"
          element={<div data-testid="project-page">Project route</div>}
        />
      </Routes>
    </MemoryRouter>,
  );

  return { onChanged };
}

describe("NotificationItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
  });

  it("shows icon, message, project link, time, and unread indicator", () => {
    renderItem();

    expect(screen.getByText("Milestone Beta is due today")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /launchpad/i })).toHaveAttribute(
      "href",
      "/projects/project-1",
    );
    expect(screen.getByLabelText(/unread/i)).toBeInTheDocument();
    expect(screen.getByText(/ago|in/i)).toBeInTheDocument();
  });

  it("marks unread notifications as read and navigates to the project on click", async () => {
    const user = userEvent.setup();
    const { onChanged } = renderItem();

    await user.click(screen.getByTestId("notification-item"));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/notifications/notification-1/read"),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("project-page")).toBeInTheDocument();
  });

  it("snoozes from the action menu", async () => {
    const user = userEvent.setup();
    const { onChanged } = renderItem();

    await user.click(
      screen.getByRole("button", {
        name: /notification actions for milestone beta is due today/i,
      }),
    );
    await user.click(screen.getByRole("menuitem", { name: /snooze 1 hour/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/notifications/notification-1/snooze",
        expect.objectContaining({ snoozeUntil: expect.any(String) }),
      ),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("dismisses by marking the notification read without navigating", async () => {
    const user = userEvent.setup();
    const { onChanged } = renderItem();

    await user.click(
      screen.getByRole("button", {
        name: /notification actions for milestone beta is due today/i,
      }),
    );
    await user.click(screen.getByRole("menuitem", { name: /dismiss/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/notifications/notification-1/read"),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("project-page")).not.toBeInTheDocument();
  });
});
