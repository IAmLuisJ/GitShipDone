import { Skeleton } from "@/components/ui/skeleton";

function TimelineSkeletonLine({ className }: { className: string }) {
  return (
    <Skeleton
      data-testid="timeline-event-skeleton-line"
      className={className}
    />
  );
}

export function TimelineEventSkeleton() {
  return (
    <li
      data-testid="timeline-event-skeleton"
      className="relative pb-6 pl-6 last:pb-0"
    >
      <Skeleton
        data-testid="timeline-event-skeleton-dot"
        className="absolute -left-2 top-1 size-4 rounded-full"
      />
      <article className="grid gap-2 rounded-lg border bg-card p-3">
        <div className="flex items-start gap-3">
          <TimelineSkeletonLine className="size-8 rounded-full" />
          <div className="grid flex-1 gap-2">
            <TimelineSkeletonLine className="h-4 w-2/3" />
            <TimelineSkeletonLine className="h-3 w-1/3" />
          </div>
        </div>
      </article>
    </li>
  );
}
