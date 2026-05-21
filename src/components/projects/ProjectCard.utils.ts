import type { ProjectStatus, ProjectType } from "@/types/project";

const typeClasses: Record<ProjectType, string> = {
  software: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  design: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200",
  physical: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200",
  content: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200",
  learning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200",
};

type StatusVariant = "default" | "secondary" | "outline" | "destructive";

const statusVariants: Record<ProjectStatus, StatusVariant> = {
  active: "default",
  on_hold: "secondary",
  completed: "outline",
  archived: "destructive",
};

export function getTypeColor(type: ProjectType) {
  return typeClasses[type];
}

export function getStatusVariant(status: ProjectStatus) {
  return statusVariants[status];
}
