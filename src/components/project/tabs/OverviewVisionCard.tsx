import { Pencil } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import type { Project } from "@/types/project";

type OverviewVisionCardProps = {
  project: Project;
};

export function OverviewVisionCard({ project }: OverviewVisionCardProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(project.description ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await api.patch<Project>(`/projects/${project.id}`, {
        description: draft.trim() || null,
      });
      queryClient.setQueryData(["project", project.id], response.data);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vision</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit vision"
            onClick={() => setIsEditing(true)}
          >
            <Pencil />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <label className="text-sm font-medium" htmlFor="vision-statement">
              Vision statement
            </label>
            <Textarea
              id="vision-statement"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                Save vision
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {project.description ??
              "No vision statement yet. Add one to keep your project focused."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
