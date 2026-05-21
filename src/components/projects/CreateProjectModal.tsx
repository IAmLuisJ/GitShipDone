import { Check, LoaderCircle } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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
import { Textarea } from "@/components/ui/textarea";
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

const predefinedSoftwareMilestones = [
  "Set up repository and CI/CD",
  "Configure authentication",
  "Set up database and ORM",
  "Build core features",
  "Write tests",
  "Set up production deployment",
  "Launch v1.0",
];

type CreateProjectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateProjectModal({
  open,
  onOpenChange,
}: CreateProjectModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("other");
  const [description, setDescription] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setStep(1);
    setName("");
    setType("other");
    setDescription("");
    setSelectedTemplates([]);
    setError(null);
    setIsSubmitting(false);
  }

  function handleNext() {
    if (step === 1 && !name.trim()) {
      setError("Project name is required.");
      return;
    }

    setError(null);
    setStep((current) => Math.min(current + 1, 3));
  }

  function handleBack() {
    setError(null);
    setStep((current) => Math.max(current - 1, 1));
  }

  function toggleTemplate(template: string) {
    setSelectedTemplates((current) =>
      current.includes(template)
        ? current.filter((item) => item !== template)
        : [...current, template],
    );
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
      const trimmedDescription = description.trim();
      const response = await api.post<Project>("/projects", {
        name: trimmedName,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
        type,
        ...(type === "software" && selectedTemplates.length > 0
          ? { milestoneTemplates: selectedTemplates }
          : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["projects", "sidebar"] });
      onOpenChange(false);
      resetForm();
      navigate(`/projects/${response.data.id}`);
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
            Step {step} of 3
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {step === 1 ? (
            <div className="grid gap-4">
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
                      className={cn("h-auto justify-start px-3 py-3 capitalize")}
                    >
                      {projectType.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="project-vision">
                Vision / description
              </label>
              <Textarea
                id="project-vision"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What does done look like?"
              />
            </div>
          ) : null}

          {step === 3 && type === "software" ? (
            <div className="grid gap-3">
              <div>
                <h3 className="font-medium">Milestone templates</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select any starting milestones you want created with the project.
                </p>
              </div>
              <div className="grid gap-2">
                {predefinedSoftwareMilestones.map((template) => {
                  const isSelected = selectedTemplates.includes(template);

                  return (
                    <button
                      key={template}
                      aria-checked={isSelected}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        isSelected && "border-primary bg-primary/10",
                      )}
                      onClick={() => toggleTemplate(template)}
                      role="checkbox"
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-4 place-items-center rounded border border-input",
                          isSelected &&
                            "border-primary bg-primary text-primary-foreground",
                        )}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                      {template}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 3 && type !== "software" ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              AI milestone suggestions can be added after the project is created.
            </div>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            {step === 1 ? (
              <Button
                key="cancel"
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            ) : (
              <Button key="back" type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button key={`next-${step}`} type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button key="create" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : null}
                {isSubmitting ? "Creating..." : "Create project"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
