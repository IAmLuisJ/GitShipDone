import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { NotificationBell } from "./NotificationBell";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function makeNotification(index: number, isRead = false) {
  return {
    id: `notification-${index}`,
    type: "milestone_due",
    projectId: "project-1",
    message: `Notification ${index}`,
    isRead,
    createdAt: `2026-05-${String(28 - index).padStart(2, "0")}T12:00:00.000Z`,
  };
}

function renderBell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <NotificationBell />
    </QueryClientProvider>,
  );

  return queryClient;
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { updated: 2 } });
  });

  it("shows unread count and the last 20 notifications", async () => {
    const notifications = Array.from({ length: 21 }, (_, index) =>
      makeNotification(index + 1, index > 1),
    );
    vi.mocked(api.get).mockResolvedValue({
      data: { notifications, unreadCount: 2 },
    });
    const user = userEvent.setup();
    renderBell();

    expect(await screen.findByText("2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /notifications/i }));

    const popover = await screen.findByRole("dialog");
    expect(within(popover).getByText("Notifications")).toBeInTheDocument();
    expect(screen.getAllByTestId("notification-item")).toHaveLength(20);
    expect(screen.getByText("Notification 1")).toBeInTheDocument();
    expect(screen.queryByText("Notification 21")).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/notifications?unreadOnly=false");
  });

  it("marks all notifications as read and clears the badge", async () => {
    let allRead = false;
    vi.mocked(api.get).mockImplementation(() =>
      Promise.resolve({
        data: {
          notifications: [makeNotification(1, allRead)],
          unreadCount: allRead ? 0 : 1,
        },
      }),
    );
    vi.mocked(api.post).mockImplementation(() => {
      allRead = true;
      return Promise.resolve({ data: { updated: 1 } });
    });
    const user = userEvent.setup();
    renderBell();

    expect(await screen.findByText("1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await user.click(screen.getByRole("button", { name: /mark all read/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/notifications/read-all"),
    );
    await waitFor(() => expect(screen.queryByText("1")).not.toBeInTheDocument());
    expect(screen.getByText("0 unread")).toBeInTheDocument();
  });

  it("shows an empty state when there are no notifications", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { notifications: [], unreadCount: 0 },
    });
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole("button", { name: /notifications/i }));

    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
