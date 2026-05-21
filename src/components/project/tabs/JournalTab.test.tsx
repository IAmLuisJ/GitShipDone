import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { JournalTab } from "./JournalTab";

vi.mock("@/lib/api", () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

let entries = [
  {
    id: "j3",
    title: "Newest update",
    body: "Newest body with the full launch details.",
    mood: "win",
    createdAt: "2026-05-21T12:00:00.000Z",
    updatedAt: "2026-05-21T12:00:00.000Z",
  },
  {
    id: "j2",
    title: "Middle update",
    body: `${"A".repeat(155)} hidden ending that appears after expansion.`,
    mood: "steady",
    createdAt: "2026-05-20T12:00:00.000Z",
    updatedAt: "2026-05-20T12:00:00.000Z",
  },
  {
    id: "j1",
    title: "Oldest update",
    body: "Old body.",
    mood: "blocked",
    createdAt: "2026-05-19T12:00:00.000Z",
    updatedAt: "2026-05-19T12:00:00.000Z",
  },
  {
    id: "j0",
    title: "Page two update",
    body: "Second page body.",
    mood: "learning",
    createdAt: "2026-05-18T12:00:00.000Z",
    updatedAt: "2026-05-18T12:00:00.000Z",
  },
];

function renderJournal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <JournalTab projectId="project-1" />
    </QueryClientProvider>,
  );

  return queryClient;
}

describe("JournalTab", () => {
  beforeEach(() => {
    entries = [...entries].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url) => {
      const page = url.includes("page=2") ? 2 : 1;
      const start = (page - 1) * 3;
      return Promise.resolve({
        data: {
          entries: entries.slice(start, start + 3),
          total: entries.length,
          page,
          limit: 3,
        },
      });
    });
    vi.mocked(api.post).mockImplementation(async (_url, payload) => {
      const entry = {
        id: "j4",
        createdAt: "2026-05-22T12:00:00.000Z",
        updatedAt: "2026-05-22T12:00:00.000Z",
        ...(payload as object),
      };
      entries = [entry as (typeof entries)[number], ...entries];
      return { data: entry };
    });
    vi.mocked(api.patch).mockImplementation(async (_url, payload) => {
      entries = entries.map((entry) =>
        entry.id === "j2" ? { ...entry, ...(payload as object) } : entry,
      );
      return { data: entries.find((entry) => entry.id === "j2") };
    });
    vi.mocked(api.delete).mockImplementation(async (url) => {
      const entryId = String(url).split("/").at(-1);
      entries = entries.filter((entry) => entry.id !== entryId);
      return { data: { message: "Journal entry deleted" } };
    });
  });

  it("lists, expands, creates, edits, deletes, and paginates journal entries", async () => {
    const user = userEvent.setup();
    renderJournal();

    const cards = await screen.findAllByTestId("journal-entry-card");
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining("Newest update"),
      expect.stringContaining("Middle update"),
      expect.stringContaining("Oldest update"),
    ]);
    expect(within(cards[0]).getByText("🏆")).toBeInTheDocument();
    expect(within(cards[1]).queryByText(/hidden ending/i)).not.toBeInTheDocument();

    await user.click(within(cards[1]).getByRole("button", { name: /expand middle update/i }));
    expect(screen.getByText(/hidden ending that appears after expansion/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /log update/i }));
    await user.type(screen.getByLabelText(/entry title/i), "Fresh win");
    await user.type(screen.getByLabelText(/entry body/i), "We shipped the thing.");
    await user.selectOptions(screen.getByLabelText(/mood/i), "win");
    await user.click(screen.getByRole("button", { name: /save entry/i }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/projects/project-1/journal", {
        title: "Fresh win",
        body: "We shipped the thing.",
        mood: "win",
      }),
    );
    expect(await screen.findByText("Fresh win")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /actions for middle update/i }));
    await user.click(screen.getByRole("menuitem", { name: /edit/i }));
    await user.clear(screen.getByLabelText(/entry title/i));
    await user.type(screen.getByLabelText(/entry title/i), "Middle update edited");
    await user.click(screen.getByRole("button", { name: /save entry/i }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/projects/project-1/journal/j2", {
        title: "Middle update edited",
        body: entries.find((entry) => entry.id === "j2")?.body,
        mood: "steady",
      }),
    );
    expect(await screen.findByText("Middle update edited")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /actions for newest update/i }));
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: /delete entry/i }));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/projects/project-1/journal/j3"),
    );
    expect(screen.queryByText("Newest update")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(await screen.findByText("Page two update")).toBeInTheDocument();
  });

  it("shows an empty state when there are no journal entries", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { entries: [], total: 0, page: 1, limit: 3 },
    });
    renderJournal();

    expect(await screen.findByText(/no journal entries yet/i)).toBeInTheDocument();
  });
});
