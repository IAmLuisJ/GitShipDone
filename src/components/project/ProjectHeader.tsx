import { Bot, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Project } from "@/types/project";

type ProjectHeaderProps = {
  project: Project;
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const progress = project.progressManual ?? project.progressAuto;

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatLabel(project.type)}</Badge>
            <Badge variant="outline">{formatLabel(project.status)}</Badge>
            <Badge variant="outline">{project.level}</Badge>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              {project.name}
            </h1>
            {project.description ? (
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-lg border px-3 py-2 text-right">
            <div className="text-lg font-semibold">{project.pointsTotal} pts</div>
            <div className="text-xs text-muted-foreground">total points</div>
          </div>
          <Button type="button" onClick={() => setIsAiPanelOpen(true)}>
            <Bot data-icon="inline-start" />
            AI PM
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Project options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil data-icon="inline-start" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <Trash2 data-icon="inline-start" />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">{progress}% complete</span>
        </div>
        <Progress value={progress} />
      </div>

      <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>AI PM</SheetTitle>
            <SheetDescription>
              Ask for next steps, risk checks, or a sharper plan for {project.name}.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 text-sm text-muted-foreground">
            The project assistant panel will connect to the AI PM workflow in an
            upcoming task.
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
