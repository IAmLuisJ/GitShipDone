import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { RichTextViewer } from "@/components/editor/RichTextViewer";
import { TimelineEventRenderer } from "@/components/project/timeline/TimelineEventRenderer";
import type { TimelineEvent } from "@/components/project/timelineEvent";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import type { ProjectStatus, ProjectType } from "@/types/project";

type PublicProject = {
  createdAt: string;
  description: string | null;
  id: string;
  level: string;
  name: string;
  pointsTotal: number;
  progressAuto: number;
  progressManual: number | null;
  status: ProjectStatus;
  type: ProjectType;
};

type PublicMilestone = {
  dueDate: string | null;
  id: string;
  name: string;
  status: string;
};

type PublicTodo = {
  dueDate: string | null;
  id: string;
  isCompleted: boolean;
  title: string;
};

type PublicJournalEntry = {
  body: string;
  createdAt: string;
  id: string;
  title: string;
};

type PublicShareResponse = {
  journalEntries: PublicJournalEntry[];
  milestones: PublicMilestone[];
  project: PublicProject;
  timeline: TimelineEvent[];
  todos: PublicTodo[];
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function PublicShareSkeleton() {
  return (
    <div className="mx-auto grid max-w-5xl gap-5 p-5 md:p-8">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function PublicShareNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>Project not found</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground">
          <p>This shared project is private, expired, or no longer available.</p>
          <Link className="font-medium text-primary hover:underline" to="/">
            Back to GitShipDone
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

export default function PublicSharePage() {
  const { token } = useParams();
  const shareQuery = useQuery({
    queryKey: ["public-share", token],
    queryFn: async () => {
      const response = await api.get<PublicShareResponse>(`/share/${token}`);
      return response.data;
    },
    enabled: Boolean(token),
    retry: false,
  });

  if (shareQuery.isLoading) {
    return <PublicShareSkeleton />;
  }

  if (shareQuery.isError || !shareQuery.data) {
    return <PublicShareNotFound />;
  }

  const { project, milestones, todos, journalEntries, timeline } = shareQuery.data;
  const progress = project.progressManual ?? project.progressAuto;

  return (
    <main data-testid="public-share-page" className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-5xl gap-5 p-5 md:p-8">
        <section className="grid gap-4 rounded-xl border bg-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{project.type}</Badge>
                <Badge variant="outline">{project.status}</Badge>
                <Badge>{project.level}</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal">
                {project.name}
              </h1>
              {project.description ? (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {project.description}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border px-3 py-2 text-right">
              <div className="text-lg font-semibold">{project.pointsTotal} pts</div>
              <div className="text-xs text-muted-foreground">public progress</div>
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">{progress}% complete</span>
            </div>
            <Progress value={progress} aria-label={`${project.name} public progress`} />
          </div>
        </section>

        {timeline.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[28rem] pr-3">
                <div className="grid gap-4">
                  {timeline.map((event) => (
                    <TimelineEventRenderer key={event.id} event={event} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : null}

        {milestones.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{milestone.name}</div>
                    <Badge variant="outline">{formatLabel(milestone.status)}</Badge>
                  </div>
                  {milestone.dueDate ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Due {formatDate(milestone.dueDate)}
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {todos.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Todos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {todos.map((todo) => (
                <label
                  key={todo.id}
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <Checkbox checked={todo.isCompleted} disabled />
                  <span>{todo.title}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {journalEntries.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Journal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {journalEntries.map((entry) => (
                <article key={entry.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-medium">{entry.title}</h2>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  <RichTextViewer content={entry.body} />
                </article>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <footer className="flex flex-col gap-2 border-t py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Powered by GitShipDone</span>
          <Link className="font-medium text-primary hover:underline" to="/">
            Track your projects →
          </Link>
        </footer>
      </div>
    </main>
  );
}
