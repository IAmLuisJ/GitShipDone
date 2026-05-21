import { LoaderCircle } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Project, ProjectType } from "@/types/project";

const projectTypes: Array<{ value: ProjectType; label: string }> = [
  { value: "software", label: "Software" },
  { value: "design", label: "Design" },
  { value: "physical", label: "Physical" },
  { value: "content", label: "Content" },
  { value: "learning", label: "Learning" },
  { value: "other", label: "Other" },
];

type CreateProjectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (project: Project) => void;
};

export function CreateProjectModal({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("other");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setType("other");
    setError(null);
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await api.post<Project>("/projects", {
        name: trimmedName,
        type,
      });
      onProjectCreated(response.data);
      onOpenChange(false);
      resetForm();
    } catch {
      setError("Unable to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Give the project a name and choose the closest type.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="project-name">
              Project name
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Project type</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {projectTypes.map((projectType) => (
                <Button
                  key={projectType.value}
                  type="button"
                  variant={type === projectType.value ? "default" : "outline"}
                  aria-pressed={type === projectType.value}
                  onClick={() => setType(projectType.value)}
                  className={cn("justify-center capitalize")}
                >
                  {projectType.label}
                </Button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : null}
              {isSubmitting ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
