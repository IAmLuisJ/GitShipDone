import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { ParkingLotTab } from "./ParkingLotTab";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const activeItem = {
  id: "idea-1",
  title: "Add dark mode",
  description: "Let users switch to a comfortable low-light theme.",
  aiPathway: null,
  archivedAt: null,
  createdAt: "2026-05-21T14:00:00.000Z",
  updatedAt: "2026-05-21T14:00:00.000Z",
};

const archivedItem = {
  id: "idea-archived",
  title: "Old idea",
  description: "Already handled later.",
  aiPathway: null,
  archivedAt: "2026-05-20T14:00:00.000Z",
  createdAt: "2026-05-20T14:00:00.000Z",
  updatedAt: "2026-05-20T14:00:00.000Z",
};

function renderParkingLotTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ParkingLotTab projectId="project-1" />
    </QueryClientProvider>,
  );
}

describe("ParkingLotTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists, adds, generates pathways, promotes, archives, and shows archived ideas", async () => {
    const user = userEvent.setup();
    let items = [activeItem];
    const pathway = "## Pathway\n\n1. Define theme tokens\n2. Add a toggle";

    vi.mocked(api.get).mockImplementation((url) => {
      if (url === "/projects/project-1/parking-lot") {
        return Promise.resolve({ data: { items } });
      }

      if (url === "/projects/project-1/parking-lot?includeArchived=true") {
        return Promise.resolve({ data: { items: [...items, archivedItem] } });
      }

      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    vi.mocked(api.post).mockImplementation((url, body) => {
      if (url === "/projects/project-1/parking-lot") {
        items = [
          {
            ...activeItem,
            id: "idea-2",
            title: body.title,
            description: body.description,
          },
          ...items,
        ];
        return Promise.resolve({ data: { item: items[0] } });
      }

      if (url === "/projects/project-1/parking-lot/idea-1/ai-pathway") {
        items = items.map((item) =>
          item.id === "idea-1" ? { ...item, aiPathway: pathway } : item,
        );
        return Promise.resolve({ data: { pathway } });
      }

      if (url === "/projects/project-1/parking-lot/idea-1/promote") {
        items = items.filter((item) => item.id !== "idea-1");
        return Promise.resolve({ data: { created: { id: "milestone-1" } } });
      }

      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });

    vi.mocked(api.patch).mockImplementation((url, body) => {
      if (url === "/projects/project-1/parking-lot/idea-2") {
        items = items.filter((item) => item.id !== "idea-2");
        expect(body).toEqual({ archived: true });
        return Promise.resolve({ data: { item: { ...activeItem, archivedAt: "now" } } });
      }

      return Promise.reject(new Error(`Unhandled PATCH ${url}`));
    });

    renderParkingLotTab();

    expect(await screen.findByText("Add dark mode")).toBeVisible();
    expect(screen.queryByText("Old idea")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Idea title"), "Offline mode");
    await user.type(screen.getByLabelText("Description"), "Queue work while offline.");
    await user.click(screen.getByRole("button", { name: "Add Idea" }));
    expect(await screen.findByText("Offline mode")).toBeVisible();

    const darkModeItem = screen.getByTestId("parking-lot-item-idea-1");
    await user.click(within(darkModeItem).getByRole("button", { name: "Generate Pathway" }));
    expect(await screen.findByRole("heading", { name: "Pathway" })).toBeVisible();
    expect(screen.getByText("Define theme tokens")).toBeVisible();

    await user.click(within(darkModeItem).getByRole("button", { name: "Promote" }));
    await user.click(screen.getByLabelText("Add as Milestone"));
    await user.click(screen.getByRole("button", { name: "Promote idea" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/projects/project-1/parking-lot/idea-1/promote",
        { targetType: "milestone" },
      ),
    );

    const offlineItem = await screen.findByTestId("parking-lot-item-idea-2");
    await user.click(within(offlineItem).getByRole("button", { name: "Archive" }));
    await user.click(screen.getByRole("button", { name: "Archive idea" }));
    await waitFor(() => expect(screen.queryByText("Offline mode")).not.toBeInTheDocument());

    await user.click(screen.getByLabelText("Show archived"));
    expect(await screen.findByText("Old idea")).toBeVisible();
    expect(api.get).toHaveBeenCalledWith(
      "/projects/project-1/parking-lot?includeArchived=true",
    );
  });
});
