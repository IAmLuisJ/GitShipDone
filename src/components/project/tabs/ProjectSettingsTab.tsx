import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import type { Project, ProjectStatus, ProjectType } from "@/types/project";
import { GithubConnectPanel } from "../GithubConnectPanel";

type ProjectSettingsTabProps = {
  project: Project;
};

type SettingsFormState = {
  description: string;
  name: string;
  status: ProjectStatus;
  type: ProjectType;
};

const projectTypeOptions: Array<{ label: string; value: ProjectType }> = [
  { label: "Software", value: "software" },
  { label: "Design", value: "design" },
  { label: "Physical", value: "physical" },
  { label: "Content", value: "content" },
  { label: "Learning", value: "learning" },
  { label: "Other", value: "other" },
];

const projectStatusOptions: Array<{ label: string; value: ProjectStatus }> = [
  { label: "Active", value: "active" },
  { label: "On hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

function getInitialFormState(project: Project): SettingsFormState {
  return {
    description: project.description ?? "",
    name: project.name,
    status: project.status,
    type: project.type,
  };
}

export function ProjectSettingsTab({ project }: ProjectSettingsTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState(() => getInitialFormState(project));
  const [confirmName, setConfirmName] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormState(getInitialFormState(project));
  }, [project]);

  const canDelete = confirmName === project.name;

  /** Submits the editable general settings and refreshes the project cache. */
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await api.patch<Project>(`/projects/${project.id}`, {
        description: formState.description,
        name: formState.name,
        status: formState.status,
        type: formState.type,
      });

      queryClient.setQueryData(["project", project.id], response.data);
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success("Project settings saved");
    } finally {
      setIsSaving(false);
    }
  }

  /** Deletes the current project after exact-name confirmation. */
  async function handleDeleteProject() {
    if (!canDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await api.delete(`/projects/${project.id}`);
      toast.success("Project deleted");
      navigate("/dashboard");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div data-testid="settings-tab" className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Keep the project identity, type, and lifecycle status current.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-type">Project type</Label>
                <select
                  id="project-type"
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      type: event.target.value as ProjectType,
                    }))
                  }
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {projectTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-status">Project status</Label>
                <select
                  id="project-status"
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      status: event.target.value as ProjectStatus,
                    }))
                  }
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {projectStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save settings"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-heading text-base leading-snug font-medium">Sharing</h2>
          <CardDescription>
            Public sharing controls will live in the dedicated sharing controls panel.
          </CardDescription>
        </CardHeader>
      </Card>

      <GithubConnectPanel project={project} />

      <Card className="border border-destructive/30 bg-destructive/5 ring-destructive/20">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Delete this project and all of its milestones, todos, notes, and history.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end border-destructive/20 bg-destructive/5">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setConfirmName("");
              setIsDeleteOpen(true);
            }}
          >
            Delete Project
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type {project.name} to confirm deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="delete-confirm-name">Type {project.name} to confirm</Label>
            <Input
              id="delete-confirm-name"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete || isDeleting}
              onClick={handleDeleteProject}
            >
              {isDeleting ? "Deleting..." : "Delete this project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
