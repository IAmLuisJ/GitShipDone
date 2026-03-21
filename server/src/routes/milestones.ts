import { Router, Request, Response, NextFunction } from "express";
import { eq, max, asc, and } from "drizzle-orm";

import { db } from "../db";
import { milestones } from "../db/schema";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
} from "../validators/milestones";
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

/**
 * GET /api/projects/:id/milestones
 * List all milestones for a project, ordered by sort_order ascending.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const result = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.sortOrder));

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/projects/:id/milestones/:mid
 * Update milestone fields (name, description, dueDate, status).
 */
router.patch(
  "/:mid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const milestoneId = req.params.mid as string;
      await getOwnedProject(projectId, req.userId!);

      const parsed = updateMilestoneSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { name, description, dueDate, status } = parsed.data;

      // Build update object with only provided fields
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (dueDate !== undefined) updates.dueDate = dueDate;
      if (status !== undefined) updates.status = status;

      const [updated] = await db
        .update(milestones)
        .set(updates)
        .where(
          and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)),
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
