import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";

import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import type { Project } from "@/types/project";

function ProjectCardSkeleton() {
  return (
    <Card data-testid="project-card-skeleton">
      <CardContent className="grid gap-4 p-6">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-2 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get<Project[]>("/projects");
      return response.data;
    },
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div data-testid="dashboard-page" className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track what you are building and keep momentum visible.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <Plus data-icon="inline-start" />
          New Project
        </Button>
      </div>

      {projectsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="px-6 py-8">
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to start tracking your work."
              action={{
                label: "Create your first project",
                onClick: () => setIsCreateOpen(true),
              }}
              className="border-0 p-4"
            />
          </CardContent>
        </Card>
      )}

      <CreateProjectModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
