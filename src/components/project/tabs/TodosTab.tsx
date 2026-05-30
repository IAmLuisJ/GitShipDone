import type { FormEvent } from "react";
import { useRef, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";

import { TodoSortableList } from "@/components/project/TodoSortableList";
import type { Todo } from "@/components/project/TodoItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { triggerLevelUpFromResponse } from "@/lib/levelUp";

type TodosTabProps = {
  projectId: string;
};

type Milestone = {
  id: string;
  name: string;
  sortOrder: number;
};

type ProjectSummary = {
  progressAuto: number;
  progressManual: number | null;
};

type TodoUpdateResponse = {
  didLevelUp?: boolean;
  level?: string;
  newLevel?: string;
  progress: number;
  todo: Todo;
};

type Filter = "all" | "active" | "completed" | "urgent";

const filterOptions: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Urgent", value: "urgent" },
];

function sortTodos(todos: Todo[]) {
  return [...todos].sort((a, b) => a.sortOrder - b.sortOrder);
}

function filterTodos(todos: Todo[], filter: Filter) {
  if (filter === "active") return todos.filter((todo) => !todo.isCompleted);
  if (filter === "completed") return todos.filter((todo) => todo.isCompleted);
  if (filter === "urgent") return todos.filter((todo) => todo.isUrgent);
  return todos;
}

export function TodosTab({ projectId }: TodosTabProps) {
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [groupByMilestone, setGroupByMilestone] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const todosQueryKey = ["project", projectId, "todos"];
  const projectQueryKey = ["project", projectId];
  const pointsLogQueryKey = ["project", projectId, "points-log"];

  const todosQuery = useQuery({
    queryKey: todosQueryKey,
    queryFn: async () => {
      const response = await api.get<Todo[]>(`/projects/${projectId}/todos`);
      return sortTodos(response.data);
    },
  });

  const milestonesQuery = useQuery({
    queryKey: ["project", projectId, "milestones"],
    queryFn: async () => {
      const response = await api.get<Milestone[]>(`/projects/${projectId}/milestones`);
      return [...response.data].sort((a, b) => a.sortOrder - b.sortOrder);
    },
  });

  const project = queryClient.getQueryData<ProjectSummary>(projectQueryKey);
  const progress = project?.progressManual ?? project?.progressAuto ?? 0;
  const orderedTodos = todosQuery.data ?? [];
  const visibleTodos = filterTodos(orderedTodos, filter);
  const milestoneNames = new Map(
    (milestonesQuery.data ?? []).map((milestone) => [milestone.id, milestone.name]),
  );

  async function persistOrder(nextTodos: Todo[]) {
    const previousTodos = queryClient.getQueryData<Todo[]>(todosQueryKey);
    queryClient.setQueryData(todosQueryKey, nextTodos);
    try {
      await api.patch(`/projects/${projectId}/todos/reorder`, {
        orderedIds: nextTodos.map((todo) => todo.id),
      });
      await queryClient.invalidateQueries({ queryKey: todosQueryKey });
    } catch (error) {
      queryClient.setQueryData(todosQueryKey, previousTodos);
      throw error;
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedTodos.findIndex((todo) => todo.id === active.id);
    const newIndex = orderedTodos.findIndex((todo) => todo.id === over.id);
    await persistOrder(arrayMove(orderedTodos, oldIndex, newIndex));
  }

  async function handleMoveUp(todo: Todo) {
    const index = orderedTodos.findIndex((item) => item.id === todo.id);
    if (index <= 0) return;

    await persistOrder(arrayMove(orderedTodos, index, index - 1));
  }

  async function handleToggle(todo: Todo) {
    const nextCompleted = !todo.isCompleted;
    const response = await api.patch<TodoUpdateResponse>(
      `/projects/${projectId}/todos/${todo.id}`,
      { isCompleted: nextCompleted },
    );
    queryClient.setQueryData<ProjectSummary>(projectQueryKey, (current) =>
      current ? { ...current, progressAuto: response.data.progress } : current,
    );
    triggerLevelUpFromResponse(response.data);
    toast.success(nextCompleted ? "+10 pts" : "-10 pts");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: todosQueryKey }),
      queryClient.invalidateQueries({ queryKey: projectQueryKey }),
      queryClient.invalidateQueries({ queryKey: pointsLogQueryKey }),
    ]);
  }

  async function handleDelete(todo: Todo) {
    const response = await api.delete<{ progress: number }>(
      `/projects/${projectId}/todos/${todo.id}`,
    );
    queryClient.setQueryData<ProjectSummary>(projectQueryKey, (current) =>
      current ? { ...current, progressAuto: response.data.progress } : current,
    );
    await queryClient.invalidateQueries({ queryKey: todosQueryKey });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    await api.post(`/projects/${projectId}/todos`, {
      title: trimmedTitle,
      ...(dueDate ? { dueDate } : {}),
      ...(isUrgent ? { isUrgent: true } : {}),
    });
    setTitle("");
    setDueDate("");
    setIsUrgent(false);
    await queryClient.invalidateQueries({ queryKey: todosQueryKey });
  }

  return (
    <Card data-testid="todos-tab">
      <CardHeader>
        <CardTitle>Todos</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{progress}% complete</span>
          </div>
          <Progress value={progress} aria-label="Todo completion progress" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            aria-label="Todo filters"
            className="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-[3px]"
          >
            {filterOptions.map((option) => {
              const isSelected = filter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  className="inline-flex h-full flex-1 items-center justify-center rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm dark:text-muted-foreground dark:hover:text-foreground"
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              aria-label="Group by milestone"
              checked={groupByMilestone}
              onCheckedChange={setGroupByMilestone}
            />
            Group by milestone
          </label>
        </div>

        {visibleTodos.length > 0 ? (
          <TodoSortableList
            groupByMilestone={groupByMilestone}
            milestoneNames={milestoneNames}
            orderedTodos={orderedTodos}
            visibleTodos={visibleTodos}
            onDelete={handleDelete}
            onDragEnd={handleDragEnd}
            onMoveUp={handleMoveUp}
            onToggle={handleToggle}
          />
        ) : (
          <EmptyState
            icon={ListChecks}
            title="No todos"
            description="Add tasks to track your work."
            action={{
              label: "Add task",
              onClick: () => titleInputRef.current?.focus(),
            }}
          />
        )}

        <form className="grid gap-3 rounded-lg border bg-muted/30 p-3" onSubmit={handleCreate}>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Todo title
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Due date
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium">
              <Checkbox
                aria-label="Mark urgent"
                checked={isUrgent}
                onCheckedChange={(checked) => setIsUrgent(checked === true)}
              />
              Urgent
            </label>
            <Button type="submit" className="self-end">
              Add
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
