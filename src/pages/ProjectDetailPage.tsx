import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { ProjectHeader } from "@/components/project/ProjectHeader";
import { JournalTab } from "@/components/project/tabs/JournalTab";
import { MilestonesTab } from "@/components/project/tabs/MilestonesTab";
import { OverviewTab } from "@/components/project/tabs/OverviewTab";
import { ParkingLotTab } from "@/components/project/tabs/ParkingLotTab";
import { ProjectSettingsTab } from "@/components/project/tabs/ProjectSettingsTab";
import { TimelineTab } from "@/components/project/tabs/TimelineTab";
import { TodosTab } from "@/components/project/tabs/TodosTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import type { Project } from "@/types/project";

const projectTabs = [
  { value: "overview", label: "Overview" },
  { value: "timeline", label: "Timeline" },
  { value: "milestones", label: "Milestones" },
  { value: "todos", label: "Todos" },
  { value: "journal", label: "Journal" },
  { value: "parking-lot", label: "Parking Lot" },
  { value: "settings", label: "Settings" },
] as const;

type ProjectTab = (typeof projectTabs)[number]["value"];

function isProjectTab(value: string | null): value is ProjectTab {
  return projectTabs.some((tab) => tab.value === value);
}

function ProjectDetailSkeleton() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="grid gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="grid gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function ProjectNotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Card className="max-w-md text-center">
        <CardHeader>
          <h1 className="text-xl font-semibold">Project not found</h1>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            This project may have been deleted or you may not have access to it.
          </p>
          <Button asChild>
            <Link to="/dashboard">Back to projects</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = isProjectTab(tabParam) ? tabParam : "overview";

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const response = await api.get<Project>(`/projects/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (tabParam === activeTab) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", activeTab);
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, searchParams, setSearchParams, tabParam]);

  function handleTabChange(value: string) {
    if (!isProjectTab(value)) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", value);
    setSearchParams(nextParams);
  }

  if (projectQuery.isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (projectQuery.isError || !projectQuery.data) {
    return <ProjectNotFound />;
  }

  const project = projectQuery.data;

  return (
    <div data-testid="project-detail-page" className="grid gap-5">
      <ProjectHeader project={project} />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto pb-1">
          <TabsList variant="line" className="min-w-max">
            {projectTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab project={project} onSelectTab={handleTabChange} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="milestones">
          <MilestonesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="todos">
          <TodosTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="journal">
          <JournalTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="parking-lot">
          <ParkingLotTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="settings">
          <ProjectSettingsTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
