import type { ButtonHTMLAttributes } from "react";
import { format } from "date-fns";
import { GripVertical, Trash2 } from "lucide-react";

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
import { useState } from "react";

export type Milestone = {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed";
  dueDate: string | null;
  sortOrder: number;
};

type MilestoneItemProps = {
  milestone: Milestone;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  onComplete: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
  onMoveUp?: (milestone: Milestone) => void;
};

function statusLabel(status: Milestone["status"]) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.slice(0, 10).split("-").map(Number);
  return format(new Date(year, month - 1, day), "MMM d, yyyy");
}

export function MilestoneItem({
  milestone,
  dragHandleProps,
  isDragging = false,
  onComplete,
  onDelete,
  onMoveUp,
}: MilestoneItemProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isCompleted = milestone.status === "completed";

  return (
    <div
      data-testid="milestone-item"
      className={cn(
        "grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center",
        isDragging && "opacity-70",
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Drag ${milestone.name}`}
          {...dragHandleProps}
        >
          <GripVertical />
        </Button>
        <Checkbox
          aria-label={`Complete ${milestone.name}`}
          checked={isCompleted}
          disabled={isCompleted}
          onCheckedChange={(checked) => {
            if (checked) {
              onComplete(milestone);
            }
          }}
        />
      </div>

      <div className="min-w-0">
        <div className="font-medium">{milestone.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={isCompleted ? "secondary" : "outline"}>
            {statusLabel(milestone.status)}
          </Badge>
          {milestone.dueDate ? (
            <span>Due {formatDueDate(milestone.dueDate)}</span>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${milestone.name} up`}
          onClick={() => onMoveUp?.(milestone)}
        >
          <GripVertical />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${milestone.name}`}
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 />
        </Button>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete milestone?</DialogTitle>
            <DialogDescription>
              This removes {milestone.name} from the project milestone list.
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
                onDelete(milestone);
              }}
            >
              Delete milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
