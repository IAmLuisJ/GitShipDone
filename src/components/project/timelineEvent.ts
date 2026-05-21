export type TimelineEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export function describeTimelineEvent(event: TimelineEvent) {
  const payload = event.payload;

  switch (event.type) {
    case "journal":
      return `Journal: ${String(payload.title ?? "Project update")}`;
    case "milestone_completed":
      return `Completed milestone: ${String(payload.milestoneName ?? "Milestone")}`;
    case "milestone_created":
      return `Created milestone: ${String(payload.milestoneName ?? "Milestone")}`;
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
