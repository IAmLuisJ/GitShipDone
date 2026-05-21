import {
  BookOpen,
  CheckSquare,
  Circle,
  GitCommit,
  Star,
  Tag,
  TrendingUp,
  Trophy,
} from "lucide-react";

import type { TimelineEvent } from "@/components/project/timelineEvent";
import { cn } from "@/lib/utils";
import { GithubCommitEvent } from "./events/GithubCommitEvent";
import { GithubReleaseEvent } from "./events/GithubReleaseEvent";
import { JournalEvent } from "./events/JournalEvent";
import { MilestoneCompletedEvent } from "./events/MilestoneCompletedEvent";
import { PointsChangeEvent } from "./events/PointsChangeEvent";
import { ProgressChangeEvent } from "./events/ProgressChangeEvent";
import { StatusChangeEvent } from "./events/StatusChangeEvent";
import { TodoBatchEvent } from "./events/TodoBatchEvent";

type TimelineEventRendererProps = {
  event: TimelineEvent;
};

const eventIcons = {
  github_commit: GitCommit,
  github_release: Tag,
  journal: BookOpen,
  milestone_completed: Trophy,
  points_change: Star,
  progress_change: TrendingUp,
  status_change: Circle,
  todo_batch: CheckSquare,
} as const;

const eventColors = {
  github_commit: "text-gray-500",
  github_release: "text-purple-500",
  journal: "text-blue-500",
  milestone_completed: "text-yellow-500",
  points_change: "text-orange-500",
  progress_change: "text-green-500",
  status_change: "text-gray-500",
  todo_batch: "text-teal-500",
} as const;

type KnownTimelineEventType = keyof typeof eventIcons;

function isKnownTimelineEventType(type: string): type is KnownTimelineEventType {
  return type in eventIcons;
}

function EventContent({ event }: TimelineEventRendererProps) {
  switch (event.type) {
    case "journal":
      return <JournalEvent payload={event.payload} />;
    case "milestone_completed":
      return <MilestoneCompletedEvent payload={event.payload} />;
    case "todo_batch":
      return <TodoBatchEvent payload={event.payload} />;
    case "github_commit":
      return <GithubCommitEvent payload={event.payload} />;
    case "github_release":
      return <GithubReleaseEvent payload={event.payload} />;
    case "progress_change":
      return <ProgressChangeEvent payload={event.payload} />;
    case "points_change":
      return <PointsChangeEvent payload={event.payload} />;
    case "status_change":
      return <StatusChangeEvent payload={event.payload} />;
    default:
      return (
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">Project activity</div>
          <div className="text-sm font-medium">Timeline event</div>
        </div>
      );
  }
}

export function TimelineEventRenderer({ event }: TimelineEventRendererProps) {
  const type = isKnownTimelineEventType(event.type) ? event.type : "status_change";
  const Icon = eventIcons[type];

  return (
    <div
      className="flex min-w-0 items-start gap-3"
      data-testid={`timeline-event-${event.type}`}
    >
      <span className="mt-0.5" data-testid="timeline-event-icon">
        <Icon
          aria-hidden="true"
          className={cn("size-4", eventColors[type])}
          data-testid="timeline-renderer-icon"
        />
      </span>
      <EventContent event={event} />
    </div>
  );
}
