import { useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import api from "@/lib/api";
import type { Project } from "@/types/project";

type ProjectProgressBarProps = {
  project: Project;
};

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function ProjectProgressBar({ project }: ProjectProgressBarProps) {
  const queryClient = useQueryClient();
  const effectiveProgress = project.progressManual ?? project.progressAuto;
  const [isEditing, setIsEditing] = useState(false);
  const [manualValue, setManualValue] = useState(String(effectiveProgress));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setManualValue(String(effectiveProgress));
  }, [effectiveProgress]);

  /** Saves a manual progress override between 0 and 100. */
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextProgress = clampProgress(Number(manualValue));
    setIsSaving(true);

    try {
      await api.patch(`/projects/${project.id}/progress`, {
        progressManual: nextProgress,
      });
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  /** Clears the manual progress override so auto progress becomes effective. */
  async function handleReset() {
    setIsSaving(true);

    try {
      await api.patch(`/projects/${project.id}/progress`, {
        progressManual: null,
      });
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Progress</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{effectiveProgress}% complete</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit progress"
            onClick={() => setIsEditing(true)}
          >
            <Pencil />
          </Button>
        </div>
      </div>
      <Progress value={effectiveProgress} aria-label={`${effectiveProgress}% complete`} />

      {project.progressManual !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
          <span>Manual override active</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={isSaving}
            aria-label="Reset progress override"
            onClick={handleReset}
          >
            <X />
            Reset
          </Button>
        </div>
      ) : null}

      {isEditing ? (
        <form onSubmit={handleSave} className="flex items-end gap-2">
          <div className="grid flex-1 gap-1">
            <label htmlFor="manual-progress" className="text-xs font-medium">
              Manual progress
            </label>
            <Input
              id="manual-progress"
              type="number"
              min={0}
              max={100}
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            aria-label="Save progress"
            disabled={isSaving}
          >
            <Check />
          </Button>
        </form>
      ) : null}
    </div>
  );
}
