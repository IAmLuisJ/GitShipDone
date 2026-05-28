import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { TimelineEventRenderer } from "@/components/project/timeline/TimelineEventRenderer";
import { TimelineEventSkeleton } from "@/components/project/timeline/TimelineEventSkeleton";
import type { TimelineEvent } from "@/components/project/timelineEvent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type TimelineTabProps = {
  projectId: string;
};

type TimelinePage = {
  events: TimelineEvent[];
  total: number;
  page: number;
  limit: number;
};

type TimelineFilter = "all" | "journal" | "milestones" | "github" | "progress" | "points";

const timelinePageSize = 50;
const timelineFilters: Array<{ label: string; value: TimelineFilter }> = [
  { label: "All", value: "all" },
  { label: "Journal", value: "journal" },
  { label: "Milestones", value: "milestones" },
  { label: "GitHub", value: "github" },
  { label: "Progress", value: "progress" },
  { label: "Points", value: "points" },
];

function eventTimeLabels(createdAt: string) {
  const date = new Date(createdAt);

  return {
    absolute: format(date, "MMM d, yyyy, h:mm a"),
    relative: formatDistanceToNow(date, { addSuffix: true }),
  };
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const timeLabels = eventTimeLabels(event.createdAt);

  return (
    <li className="relative pb-6 pl-6 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute -left-2 top-1 flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-primary"
        data-testid="timeline-dot"
      >
        <span className="size-2 rounded-full bg-primary" />
      </span>
      <article className="grid gap-1 rounded-lg border bg-card p-3">
        <TimelineEventRenderer event={event} />
        <time
          className="pl-7 text-xs text-muted-foreground"
          dateTime={event.createdAt}
          title={timeLabels.absolute}
        >
          {timeLabels.relative}
        </time>
      </article>
    </li>
  );
}

export function TimelineTab({ projectId }: TimelineTabProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");

  const timelineQuery = useInfiniteQuery({
    queryKey: ["project", projectId, "timeline", filter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const typeParam = filter === "all" ? "" : `&type=${filter}`;
      const response = await api.get<TimelinePage>(
        `/projects/${projectId}/timeline?page=${pageParam}&limit=${timelinePageSize}${typeParam}`,
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const events = useMemo(() => {
    const loadedEvents = timelineQuery.data?.pages.flatMap((page) => page.events) ?? [];

    return [...loadedEvents].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [timelineQuery.data]);

  return (
    <Card data-testid="timeline-tab">
      <CardHeader className="grid gap-3">
        <CardTitle>Timeline</CardTitle>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Timeline filters">
          {timelineFilters.map((option) => {
            const isSelected = filter === option.value;

            return (
              <Badge
                key={option.value}
                asChild
                variant={isSelected ? "default" : "outline"}
                className={cn("h-7 cursor-pointer px-3", !isSelected && "bg-background")}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              </Badge>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {timelineQuery.isLoading ? (
          <ol className="relative ml-4 border-l border-muted" data-testid="timeline-list">
            {Array.from({ length: 5 }).map((_, index) => (
              <TimelineEventSkeleton key={index} />
            ))}
          </ol>
        ) : events.length > 0 ? (
          <ol className="relative ml-4 border-l border-muted" data-testid="timeline-list">
            {events.map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))}
          </ol>
        ) : (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Start working on your project."
          />
        )}

        {timelineQuery.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            disabled={timelineQuery.isFetchingNextPage}
            onClick={() => timelineQuery.fetchNextPage()}
          >
            {timelineQuery.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
