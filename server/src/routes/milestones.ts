import { Router, Request, Response, NextFunction } from "express";
import { eq, max } from "drizzle-orm";

import { db } from "../db";
import { milestones } from "../db/schema";
import { createMilestoneSchema } from "../validators/milestones";
import { getOwnedProject } from "../utils/projectOwnership";

const router = Router({ mergeParams: true });

/**
 * POST /api/projects/:id/milestones
 * Create a new milestone under a project. Sort order defaults to end of list.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const parsed = createMilestoneSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, description, dueDate, status } = parsed.data;

    const [maxResult] = await db
      .select({ maxOrder: max(milestones.sortOrder) })
      .from(milestones)
      .where(eq(milestones.projectId, projectId));

    const nextSortOrder = (maxResult?.maxOrder ?? -1) + 1;

    const [milestone] = await db
      .insert(milestones)
      .values({
        projectId,
        name,
        description: description ?? null,
        dueDate: dueDate ?? null,
        status: status ?? "pending",
        sortOrder: nextSortOrder,
      })
      .returning();

    res.status(201).json(milestone);
  } catch (err) {
    next(err);
  }
});

export default router;
