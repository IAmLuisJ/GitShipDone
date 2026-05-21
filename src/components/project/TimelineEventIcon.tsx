import {
  CheckCircle2,
  CircleDot,
  Clock3,
  Coins,
  GitCommit,
  GitPullRequest,
  NotebookPen,
  TrendingUp,
} from "lucide-react";

export function TimelineEventIcon({ type }: { type: string }) {
  const Icon =
    type === "journal"
      ? NotebookPen
      : type.startsWith("milestone")
        ? CheckCircle2
        : type === "github_commit"
          ? GitCommit
          : type === "github_release"
            ? GitPullRequest
            : type === "progress_change"
              ? TrendingUp
              : type === "points_change"
                ? Coins
                : type === "status_change"
                  ? CircleDot
                  : Clock3;

  return (
    <Icon
      aria-hidden="true"
      className="size-4 text-muted-foreground"
      data-testid="timeline-event-icon"
    />
  );
}
