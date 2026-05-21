import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";

import { TimelineEventIcon } from "@/components/project/TimelineEventIcon";
import { describeTimelineEvent, type TimelineEvent } from "@/components/project/timelineEvent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";

type TimelineResponse = {
  events: TimelineEvent[];
};

type OverviewActivityCardProps = {
  projectId: string;
};

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
              <TimelineEventIcon type={event.type} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {describeTimelineEvent(event)}
                </div>
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
