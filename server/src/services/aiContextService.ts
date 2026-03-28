import { eq, desc, isNull, and } from "drizzle-orm";
import { db } from "../db";
import {
  projects,
  milestones,
  todos,
  journalEntries,
} from "../db/schema";

/**
 * Build a concise project context string for AI prompt injection.
 * Kept under ~1500 words to stay within token budgets.
 */
export async function buildProjectContext(
  projectId: string,
): Promise<string> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return "Project not found.";

  const topMilestones = await db
    .select({
      name: milestones.name,
      status: milestones.status,
    })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(milestones.sortOrder)
    .limit(5);

  const recentJournals = await db
    .select({ title: journalEntries.title })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.projectId, projectId),
        isNull(journalEntries.deletedAt),
      ),
    )
    .orderBy(desc(journalEntries.createdAt))
    .limit(3);

  const allTodos = await db
    .select({ isCompleted: todos.isCompleted })
    .from(todos)
    .where(eq(todos.projectId, projectId));

  const openTodos = allTodos.filter((t) => !t.isCompleted).length;

  const vision = project.description
    ? project.description.slice(0, 500)
    : "Not set";

  const progress = project.progressManual ?? project.progressAuto;

  const milestonesStr =
    topMilestones.length > 0
      ? topMilestones.map((m) => `- ${m.name} (${m.status})`).join("\n")
      : "None";

  const journalStr =
    recentJournals.length > 0
      ? recentJournals.map((j) => `- ${j.title}`).join("\n")
      : "None";

  return [
    `Project: ${project.name} (${project.type})`,
    `Vision: ${vision}`,
    `Status: ${project.status} | Progress: ${progress}%`,
    `Level: ${project.level} (${project.pointsTotal} pts)`,
    `Milestones:\n${milestonesStr}`,
    `Recent journal:\n${journalStr}`,
    `Open todos: ${openTodos}`,
  ].join("\n");
}
