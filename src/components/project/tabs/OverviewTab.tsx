import { NotebookPen, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import api from "@/lib/api";
import type { Project } from "@/types/project";
import { LogUpdateDialog } from "./LogUpdateDialog";
import { OverviewActivityCard } from "./OverviewActivityCard";
import { OverviewVisionCard } from "./OverviewVisionCard";

type ProjectTab =
  | "overview"
  | "timeline"
  | "milestones"
  | "todos"
  | "journal"
  | "parking-lot"
  | "settings";

type OverviewTabProps = {
  project: Project;
  onSelectTab?: (tab: ProjectTab) => void;
};

type Milestone = {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed";
};

export function OverviewTab({ project, onSelectTab }: OverviewTabProps) {
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const milestonesQuery = useQuery({
    queryKey: ["project", project.id, "milestones"],
    queryFn: async () => {
      const response = await api.get<Milestone[]>(`/projects/${project.id}/milestones`);
      return response.data;
    },
  });

  const progress = project.progressManual ?? project.progressAuto;
  const milestones = milestonesQuery.data ?? [];
  const completedMilestones = milestones.filter(
    (milestone) => milestone.status === "completed",
  ).length;

  return (
    <div
      data-testid="overview-tab"
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="grid gap-4">
        <OverviewVisionCard project={project} />

        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">
                  Auto {project.progressAuto}%
                  {project.progressManual !== null
                    ? ` · Manual ${project.progressManual}%`
                    : ""}
                </span>
              </div>
              <Progress value={progress} aria-label="Project progress" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="text-lg font-semibold">{project.pointsTotal} pts</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
              <div className="rounded-lg border p-3">
                <Badge variant="secondary">{project.level}</Badge>
                <div className="mt-2 text-xs text-muted-foreground">Level</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-lg font-semibold">
                  {completedMilestones} of {milestones.length} completed
                </div>
                <div className="text-xs text-muted-foreground">Milestones</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setIsJournalOpen(true)}>
              <NotebookPen data-icon="inline-start" />
              Log Update
            </Button>
            <Button type="button" variant="outline" onClick={() => onSelectTab?.("todos")}>
              <Plus data-icon="inline-start" />
              Add Todo
            </Button>
          </CardContent>
        </Card>
      </div>

      <OverviewActivityCard projectId={project.id} />
      <LogUpdateDialog
        open={isJournalOpen}
        onOpenChange={setIsJournalOpen}
        projectId={project.id}
      />
    </div>
  );
}
