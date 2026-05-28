import { formatDistanceToNow } from "date-fns";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

type PointsDisplayProps = {
  project: Project;
};

type PointsLogEntry = {
  createdAt: string;
  delta: number;
  id: string;
  reason: string;
  source: string;
};

const levelClasses: Record<string, string> = {
  Seed: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200",
  Sprout:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  Growing:
    "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-200",
  Shipping:
    "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-950 dark:text-orange-200",
  Launched:
    "bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-950 dark:text-purple-200",
};

export function PointsDisplay({ project }: PointsDisplayProps) {
  const pointsQuery = useQuery({
    queryKey: ["project", project.id, "points-log"],
    queryFn: async () => {
      const response = await api.get<PointsLogEntry[]>(
        `/projects/${project.id}/points-log`,
      );
      return response.data;
    },
  });

  const entries = pointsQuery.data ?? [];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-auto justify-start gap-3 px-3 py-2 text-left"
            aria-label="Points history"
          >
            <span
              data-testid="level-badge"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                levelClasses[project.level] ?? levelClasses.Seed,
              )}
            >
              <Star className="size-3" />
              {project.level}
            </span>
            <span className="grid">
              <span className="text-lg font-semibold leading-none">
                {project.pointsTotal} pts
              </span>
              <span className="mt-1 text-xs text-muted-foreground">total points</span>
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          align="end"
          className="grid max-w-80 gap-2 bg-popover text-popover-foreground ring-1 ring-border"
        >
          <div className="font-medium">Recent points</div>
          {pointsQuery.isLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : entries.length > 0 ? (
            <div className="grid gap-2">
              {entries.map((entry) => (
                <div key={entry.id} className="grid gap-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{entry.reason}</span>
                    <span
                      className={cn(
                        "font-medium",
                        entry.delta >= 0 ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                    </span>
                  </div>
                  <div className="text-[0.7rem] text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No point changes yet.</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
