import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/lib/api";
import { useLevelUpStore } from "@/stores/levelUpStore";
import { TodosTab } from "./TodosTab";

const { toastSuccessMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
  },
}));

const todos = [
  {
    id: "t3",
    title: "Ship copy",
    isCompleted: false,
    isUrgent: false,
    dueDate: null,
    milestoneId: "m2",
    sortOrder: 3,
  },
  {
    id: "t1",
    title: "Write tests",
    isCompleted: false,
    isUrgent: true,
    dueDate: "2026-06-06",
    milestoneId: "m1",
    sortOrder: 2,
  },
  {
    id: "t2",
    title: "Sketch launch",
    isCompleted: true,
    isUrgent: false,
    dueDate: null,
    milestoneId: null,
    sortOrder: 1,
  },
];

const milestones = [
  { id: "m1", name: "Beta milestone", status: "pending", dueDate: null, sortOrder: 1 },
  { id: "m2", name: "Launch milestone", status: "pending", dueDate: null, sortOrder: 2 },
];

function renderTodos() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  queryClient.setQueryData(["project", "project-1"], {
    id: "project-1",
    progressAuto: 33,
    progressManual: null,
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TodosTab projectId="project-1" />
    </QueryClientProvider>,
  );

  return queryClient;
}

describe("TodosTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLevelUpStore.setState({ celebration: null });
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === "/projects/project-1/todos") {
        return Promise.resolve({ data: todos });
      }
      if (url === "/projects/project-1/milestones") {
        return Promise.resolve({ data: milestones });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    vi.mocked(api.patch).mockResolvedValue({
      data: {
        todo: { ...todos[1], isCompleted: true },
        progress: 67,
        didLevelUp: true,
        newLevel: "Growing",
      },
    });
    vi.mocked(api.post).mockResolvedValue({
      data: { id: "t4", title: "Write docs", isCompleted: false, isUrgent: true },
    });
    vi.mocked(api.delete).mockResolvedValue({ data: { progress: 50 } });
  });

  it("lists, filters, groups, toggles, creates, deletes, and reorders todos", async () => {
    const user = userEvent.setup();
    const queryClient = renderTodos();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const items = await screen.findAllByTestId("todo-item");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Sketch launch"),
      expect.stringContaining("Write tests"),
      expect.stringContaining("Ship copy"),
    ]);
    expect(within(screen.getByTestId("todo-item-t1")).getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText(/due jun 6, 2026/i)).toBeInTheDocument();
    expect(screen.getByText("33% complete")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /active/i }));
    expect(screen.queryByText("Sketch launch")).not.toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /urgent/i }));
    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.queryByText("Ship copy")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /all/i }));
    await user.click(screen.getByLabelText(/group by milestone/i));
    expect(screen.getByText("Beta milestone")).toBeInTheDocument();
    expect(screen.getByText("Launch milestone")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /complete write tests/i }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/projects/project-1/todos/t1", {
        isCompleted: true,
      }),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("+10 pts");
    expect(queryClient.getQueryData(["project", "project-1"])).toMatchObject({
      progressAuto: 67,
    });
    expect(useLevelUpStore.getState().celebration).toMatchObject({
      level: "Growing",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["project", "project-1", "points-log"],
    });

    await user.type(screen.getByLabelText(/^todo title$/i), "Write docs");
    await user.type(screen.getByLabelText(/due date/i), "2026-06-20");
    await user.click(screen.getByLabelText(/mark urgent/i));
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/projects/project-1/todos", {
        title: "Write docs",
        dueDate: "2026-06-20",
        isUrgent: true,
      }),
    );

    await user.click(screen.getByRole("button", { name: /delete sketch launch/i }));
    await user.click(screen.getByRole("button", { name: /delete todo/i }));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/projects/project-1/todos/t2"),
    );

    const shipCopy = screen.getByTestId("todo-item-t3");
    await user.click(within(shipCopy).getByRole("button", { name: /move ship copy up/i }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/projects/project-1/todos/reorder", {
        orderedIds: ["t2", "t3", "t1"],
      }),
    );
  });

  it("shows an empty state when there are no todos", async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === "/projects/project-1/todos") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/projects/project-1/milestones") {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });

    renderTodos();

    expect(await screen.findByText("No todos")).toBeInTheDocument();
    expect(screen.getByText("Add tasks to track your work.")).toBeInTheDocument();
  });
});
