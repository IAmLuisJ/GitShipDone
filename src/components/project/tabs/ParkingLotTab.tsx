import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ParkingLotItem,
  type ParkingLotIdea,
} from "@/components/project/ParkingLotItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

type ParkingLotTabProps = {
  projectId: string;
};

type ParkingLotResponse = {
  items: ParkingLotIdea[];
};

const parkingLotQueryRoot = (projectId: string) => [
  "project",
  projectId,
  "parking-lot",
];

export function ParkingLotTab({ projectId }: ParkingLotTabProps) {
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const queryRoot = parkingLotQueryRoot(projectId);

  const parkingLotQuery = useQuery({
    queryKey: [...queryRoot, includeArchived],
    queryFn: async () => {
      const archivedParam = includeArchived ? "?includeArchived=true" : "";
      const response = await api.get<ParkingLotResponse>(
        `/projects/${projectId}/parking-lot${archivedParam}`,
      );
      return response.data.items;
    },
  });

  async function invalidateParkingLot() {
    await queryClient.invalidateQueries({ queryKey: queryRoot });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      return;
    }

    await api.post(`/projects/${projectId}/parking-lot`, {
      title: trimmedTitle,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    });
    setTitle("");
    setDescription("");
    await invalidateParkingLot();
  }

  async function handlePromote(
    item: ParkingLotIdea,
    targetType: "milestone" | "todo",
  ) {
    await api.post(`/projects/${projectId}/parking-lot/${item.id}/promote`, {
      targetType,
    });
    await Promise.all([
      invalidateParkingLot(),
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "milestones"] }),
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "todos"] }),
    ]);
  }

  async function handleArchive(item: ParkingLotIdea) {
    await api.patch(`/projects/${projectId}/parking-lot/${item.id}`, {
      archived: true,
    });
    await invalidateParkingLot();
  }

  const items = parkingLotQuery.data ?? [];

  return (
    <Card data-testid="parking-lot-tab">
      <CardHeader className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Parking Lot</CardTitle>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />
            Show archived
          </label>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form className="grid gap-3 rounded-lg border bg-muted/30 p-3" onSubmit={handleCreate}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1 text-sm font-medium">
              Idea title
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <Button type="submit">
              <Lightbulb data-icon="inline-start" />
              Add Idea
            </Button>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Description
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </form>

        {items.length > 0 ? (
          <div className="grid gap-3">
            {items.map((item) => (
              <ParkingLotItem
                key={item.id}
                item={item}
                onArchive={handleArchive}
                onPathwayChange={invalidateParkingLot}
                onPromote={handlePromote}
                projectId={projectId}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Lightbulb}
            title="No ideas yet"
            description="Add ideas you want to explore later."
            action={{
              label: "Add idea",
              onClick: () => titleInputRef.current?.focus(),
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
