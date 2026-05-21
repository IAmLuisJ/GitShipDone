import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock3,
  GitCommit,
  GitPullRequest,
  NotebookPen,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

type TimelineEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type TimelineResponse = {
  events: TimelineEvent[];
};

type OverviewActivityCardProps = {
  projectId: string;
};

function describeEvent(event: TimelineEvent) {
  const payload = event.payload;

  switch (event.type) {
    case "journal":
      return `Journal: ${String(payload.title ?? "Project update")}`;
    case "milestone_completed":
      return `Completed milestone: ${String(payload.milestoneName ?? "Milestone")}`;
    case "todo_batch":
      return `Todo progress: ${String(payload.summary ?? "Tasks updated")}`;
    case "github_commit":
      return `Commit: ${String(payload.message ?? "New commit")}`;
    case "github_release":
      return `Release: ${String(payload.name ?? "New release")}`;
    case "progress_change":
      return `Progress changed to ${String(payload.to ?? payload.progress ?? "?")}%`;
    case "points_change":
      return `Points changed: ${String(payload.delta ?? "0")}`;
    case "status_change":
      return `Status changed to ${String(payload.to ?? "updated")}`;
    default:
      return "Project activity";
  }
}

function EventIcon({ type }: { type: string }) {
  const Icon =
    type === "journal"
      ? NotebookPen
      : type === "milestone_completed"
        ? CheckCircle2
        : type === "github_commit"
          ? GitCommit
          : type === "github_release"
            ? GitPullRequest
            : type === "progress_change" || type === "points_change"
              ? TrendingUp
              : Clock3;

  return <Icon className="size-4 text-muted-foreground" />;
}

export function OverviewActivityCard({ projectId }: OverviewActivityCardProps) {
  const timelineQuery = useQuery({
    queryKey: ["project", projectId, "timeline", 5],
    queryFn: async () => {
      const response = await api.get<TimelineResponse>(
        `/projects/${projectId}/timeline?limit=5`,
      );
      return response.data.events;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {(timelineQuery.data ?? []).length > 0 ? (
          timelineQuery.data?.map((event) => (
            <div key={event.id} className="flex gap-3 rounded-lg border p-3">
              <EventIcon type={event.type} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{describeEvent(event)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
