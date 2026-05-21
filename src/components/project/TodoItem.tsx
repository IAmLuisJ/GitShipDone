import type { ButtonHTMLAttributes } from "react";
import { useState } from "react";
import { format } from "date-fns";
import { Flame, GripVertical, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type Todo = {
  id: string;
  title: string;
  isCompleted: boolean;
  isUrgent: boolean;
  dueDate: string | null;
  milestoneId: string | null;
  sortOrder: number;
};

type TodoItemProps = {
  todo: Todo;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  onDelete: (todo: Todo) => void;
  onMoveUp?: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
};

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.slice(0, 10).split("-").map(Number);
  return format(new Date(year, month - 1, day), "MMM d, yyyy");
}

export function TodoItem({
  todo,
  dragHandleProps,
  isDragging = false,
  onDelete,
  onMoveUp,
  onToggle,
}: TodoItemProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <div
      data-testid="todo-item"
      data-todo-id={todo.id}
      className={cn(
        "group grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center",
        isDragging && "opacity-70",
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Drag ${todo.title}`}
          {...dragHandleProps}
        >
          <GripVertical />
        </Button>
        <Checkbox
          aria-label={`${todo.isCompleted ? "Uncheck" : "Complete"} ${todo.title}`}
          checked={todo.isCompleted}
          onCheckedChange={() => onToggle(todo)}
        />
      </div>

      <div className="min-w-0">
        <div
          className={cn(
            "font-medium",
            todo.isCompleted && "text-muted-foreground line-through",
          )}
        >
          {todo.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {todo.isUrgent ? (
            <Badge variant="destructive" className="gap-1">
              <Flame data-icon="inline-start" />
              Urgent
            </Badge>
          ) : null}
          {todo.dueDate ? <span>Due {formatDueDate(todo.dueDate)}</span> : null}
        </div>
      </div>

      <div className="flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${todo.title} up`}
          onClick={() => onMoveUp?.(todo)}
        >
          <GripVertical />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${todo.title}`}
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 />
        </Button>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete todo?</DialogTitle>
            <DialogDescription>
              This removes {todo.title} from the project todo list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setIsDeleteOpen(false);
                onDelete(todo);
              }}
            >
              Delete todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
