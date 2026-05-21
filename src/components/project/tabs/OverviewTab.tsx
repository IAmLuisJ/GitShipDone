import type { Project } from "@/types/project";
import { ProjectTabPlaceholder } from "./ProjectTabPlaceholder";

type OverviewTabProps = {
  project: Project;
};

export function OverviewTab({ project }: OverviewTabProps) {
  return (
    <ProjectTabPlaceholder
      title="Overview"
      description="Project vision, stats, and recent activity will live here."
      testId="overview-tab"
    >
      <span>{project.description ?? "No project vision has been added yet."}</span>
    </ProjectTabPlaceholder>
  );
}
