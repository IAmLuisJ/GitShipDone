export type ProjectType =
  | "software"
  | "design"
  | "physical"
  | "content"
  | "learning"
  | "other";

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  progressAuto: number;
  progressManual: number | null;
  pointsTotal: number;
  level: string;
  updatedAt: string;
};
