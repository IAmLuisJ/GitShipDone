import { LoaderCircle } from "lucide-react";
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
import { MilestoneTemplatesStep } from "./MilestoneTemplatesStep";
import { PREDEFINED_SOFTWARE_MILESTONES } from "./milestoneTemplates";

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
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(
    PREDEFINED_SOFTWARE_MILESTONES.map((milestone) => milestone.name),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setStep(1);
    setName("");
    setType("other");
    setDescription("");
    setSelectedTemplates(
      PREDEFINED_SOFTWARE_MILESTONES.map((milestone) => milestone.name),
    );
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
      <DialogContent className="h-dvh max-h-dvh max-w-full rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-sm sm:rounded-xl">
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
            <MilestoneTemplatesStep
              selectedTemplates={selectedTemplates}
              onChange={setSelectedTemplates}
              onSkip={() => setSelectedTemplates([])}
            />
          ) : null}

          {step === 3 && type !== "software" ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <h3 className="font-medium">Ready to create!</h3>
              <p className="mt-1 text-muted-foreground">
                Your project details are set. You can add milestones after the
                project is created.
              </p>
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
