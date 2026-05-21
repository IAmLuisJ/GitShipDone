import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types/project";

import { getStatusVariant, getTypeColor } from "./ProjectCard.utils";

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

function getProgressClass(progress: number) {
  if (progress >= 80) {
    return "[&_[data-slot=progress-indicator]]:bg-green-500";
  }

  if (progress >= 40) {
    return "[&_[data-slot=progress-indicator]]:bg-blue-500";
  }

  return "[&_[data-slot=progress-indicator]]:bg-orange-500";
}

export function ProjectCard({ project }: { project: Project }) {
  const progress = project.progressManual ?? project.progressAuto;

  return (
    <Card
      className="transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <Link to={`/projects/${project.id}`} aria-label={project.name}>
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>
                <h2 className="truncate text-base">{project.name}</h2>
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {project.description || "No description yet."}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(project.status)}>
              {statusLabels[project.status]}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("capitalize", getTypeColor(project.type))}>
              {project.type}
            </Badge>
            <Badge variant="secondary">{project.level}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress
              value={progress}
              className={getProgressClass(progress)}
              aria-label={`${project.name} progress`}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{project.pointsTotal} pts</span>
            <span className="text-muted-foreground">
              Updated{" "}
              {formatDistanceToNow(new Date(project.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
