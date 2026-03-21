import { eq } from "drizzle-orm";
import { db } from "../db";
import { projects } from "../db/schema";

export const LEVELS = [
  { name: "Seed", min: 0 },
  { name: "Sprout", min: 100 },
  { name: "Growing", min: 300 },
  { name: "Shipping", min: 700 },
  { name: "Launched", min: 1500 },
];

/**
 * Pure function: map points total to a level name.
 */
export function getLevel(points: number): string {
  let level = LEVELS[0].name;
  for (const l of LEVELS) {
    if (points >= l.min) level = l.name;
  }
  return level;
}

/**
 * Recalculate and persist the project level based on current points.
 * Returns the new level and whether a level-up occurred.
 */
export async function recalculateLevel(
  projectId: string,
  points: number,
): Promise<{ level: string; didLevelUp: boolean }> {
  const newLevel = getLevel(points);

  const [current] = await db
    .select({ level: projects.level })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const didLevelUp = !!current && current.level !== newLevel;

  await db
    .update(projects)
    .set({ level: newLevel })
    .where(eq(projects.id, projectId));

  return { level: newLevel, didLevelUp };
}
