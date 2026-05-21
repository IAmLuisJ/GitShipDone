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
import type { Project, ProjectStatus, ProjectType } from "@/types/project";

const typeClasses: Record<ProjectType, string> = {
  software: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  design: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200",
  physical: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200",
  content: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200",
  learning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200",
};

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
            <Badge variant="outline">{statusLabels[project.status]}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("capitalize", typeClasses[project.type])}>
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
