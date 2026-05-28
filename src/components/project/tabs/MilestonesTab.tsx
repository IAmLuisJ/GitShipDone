import type { CSSProperties, FormEvent } from "react";
import { useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { MilestoneItem, type Milestone } from "@/components/project/MilestoneItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Flag } from "lucide-react";
import api from "@/lib/api";
import { triggerLevelUpFromResponse } from "@/lib/levelUp";

type MilestonesTabProps = {
  projectId: string;
};

type SortableMilestoneProps = {
  milestone: Milestone;
  onComplete: (milestone: Milestone) => void;
  onDelete: (milestone: Milestone) => void;
  onMoveUp: (milestone: Milestone) => void;
};

type MilestoneCompleteResponse = {
  didLevelUp?: boolean;
  level?: string;
  newLevel?: string;
  milestone: Milestone;
  project: unknown;
};

function sortMilestones(milestones: Milestone[]) {
  return [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
}

function SortableMilestone({
  milestone,
  onComplete,
  onDelete,
  onMoveUp,
}: SortableMilestoneProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: milestone.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <MilestoneItem
        milestone={milestone}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        onComplete={onComplete}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
      />
    </div>
  );
}

export function MilestonesTab({ projectId }: MilestonesTabProps) {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const milestoneQueryKey = ["project", projectId, "milestones"];

  const milestonesQuery = useQuery({
    queryKey: milestoneQueryKey,
    queryFn: async () => {
      const response = await api.get<Milestone[]>(`/projects/${projectId}/milestones`);
      return sortMilestones(response.data);
    },
  });

  const orderedMilestones = milestonesQuery.data ?? [];

  async function persistOrder(nextMilestones: Milestone[]) {
    const previousMilestones = queryClient.getQueryData<Milestone[]>(milestoneQueryKey);
    queryClient.setQueryData(milestoneQueryKey, nextMilestones);
    try {
      await api.patch(`/projects/${projectId}/milestones/reorder`, {
        milestoneIds: nextMilestones.map((milestone) => milestone.id),
      });
      await queryClient.invalidateQueries({ queryKey: milestoneQueryKey });
    } catch (error) {
      queryClient.setQueryData(milestoneQueryKey, previousMilestones);
      throw error;
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedMilestones.findIndex((item) => item.id === active.id);
    const newIndex = orderedMilestones.findIndex((item) => item.id === over.id);
    await persistOrder(arrayMove(orderedMilestones, oldIndex, newIndex));
  }

  async function handleMoveUp(milestone: Milestone) {
    const index = orderedMilestones.findIndex((item) => item.id === milestone.id);
    if (index <= 0) {
      return;
    }

    await persistOrder(arrayMove(orderedMilestones, index, index - 1));
  }

  async function handleComplete(milestone: Milestone) {
    const response = await api.post<MilestoneCompleteResponse>(
      `/projects/${projectId}/milestones/${milestone.id}/complete`,
    );
    triggerLevelUpFromResponse(response.data);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: milestoneQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
    ]);
  }

  async function handleDelete(milestone: Milestone) {
    await api.delete(`/projects/${projectId}/milestones/${milestone.id}`);
    await queryClient.invalidateQueries({
      queryKey: milestoneQueryKey,
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    await api.post(`/projects/${projectId}/milestones`, {
      name: trimmedName,
      ...(dueDate ? { dueDate: `${dueDate}T00:00:00.000Z` } : {}),
    });
    setName("");
    setDueDate("");
    await queryClient.invalidateQueries({
      queryKey: milestoneQueryKey,
    });
  }

  return (
    <Card data-testid="milestones-tab">
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {orderedMilestones.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedMilestones.map((milestone) => milestone.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-2">
                {orderedMilestones.map((milestone) => (
                  <SortableMilestone
                    key={milestone.id}
                    milestone={milestone}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onMoveUp={handleMoveUp}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <EmptyState
            icon={Flag}
            title="No milestones"
            description="Add a milestone to track your goals."
            action={{
              label: "Add milestone",
              onClick: () => nameInputRef.current?.focus(),
            }}
          />
        )}

        <form className="grid gap-3 rounded-lg border bg-muted/30 p-3" onSubmit={handleCreate}>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Milestone name
              <Input
                ref={nameInputRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
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
            <Button type="submit" className="self-end">
              Add
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
