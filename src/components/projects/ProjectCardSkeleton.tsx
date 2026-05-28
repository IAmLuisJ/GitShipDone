import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ProjectSkeletonLine({ className }: { className: string }) {
  return (
    <Skeleton
      data-testid="project-card-skeleton-line"
      className={className}
    />
  );
}

export function ProjectCardSkeleton() {
  return (
    <Card data-testid="project-card-skeleton">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-2">
            <ProjectSkeletonLine className="h-5 w-2/3" />
            <ProjectSkeletonLine className="h-4 w-full" />
            <ProjectSkeletonLine className="h-4 w-4/5" />
          </div>
          <ProjectSkeletonLine className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <ProjectSkeletonLine className="h-6 w-20 rounded-full" />
          <ProjectSkeletonLine className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <ProjectSkeletonLine className="h-4 w-16" />
            <ProjectSkeletonLine className="h-4 w-10" />
          </div>
          <ProjectSkeletonLine className="h-2 w-full" />
        </div>
        <div className="flex items-center justify-between">
          <ProjectSkeletonLine className="h-4 w-16" />
          <ProjectSkeletonLine className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
