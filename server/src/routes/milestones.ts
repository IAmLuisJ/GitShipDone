import { Router, Request, Response, NextFunction } from "express";
import { eq, max, asc, and } from "drizzle-orm";

import { db } from "../db";
import { milestones, projects, timelineEvents } from "../db/schema";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
} from "../validators/milestones";
import { getOwnedProject } from "../utils/projectOwnership";
import { awardPoints } from "../services/pointsService";

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

/**
 * POST /api/projects/:id/milestones/:mid/complete
 * Mark a milestone as completed, award 50 points, log timeline event.
 */
router.post(
  "/:mid/complete",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const milestoneId = req.params.mid as string;
      await getOwnedProject(projectId, req.userId!);

      // Find the milestone
      const [milestone] = await db
        .select()
        .from(milestones)
        .where(
          and(
            eq(milestones.id, milestoneId),
            eq(milestones.projectId, projectId),
          ),
        )
        .limit(1);

      if (!milestone) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      if (milestone.status === "completed") {
        res.status(400).json({ error: "Milestone is already completed" });
        return;
      }

      // Mark milestone as completed
      const [updatedMilestone] = await db
        .update(milestones)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(milestones.id, milestoneId))
        .returning();

      // Award 50 points
      await awardPoints(
        projectId,
        50,
        `Milestone completed: ${milestone.name}`,
        "milestone",
      );

      // Log milestone_completed timeline event
      await db.insert(timelineEvents).values({
        projectId,
        type: "milestone_completed",
        refId: milestoneId,
        payload: {
          milestoneId,
          milestoneName: milestone.name,
          points: 50,
        },
      });

      // Fetch updated project
      const [updatedProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      res.status(200).json({ milestone: updatedMilestone, project: updatedProject });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/projects/:id/milestones/:mid
 * Delete a milestone. Linked todos have milestone_id set to null via FK set null.
 */
router.delete(
  "/:mid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const milestoneId = req.params.mid as string;
      await getOwnedProject(projectId, req.userId!);

      const [deleted] = await db
        .delete(milestones)
        .where(
          and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)),
        )
        .returning();

      if (!deleted) {
        res.status(404).json({ error: "Milestone not found" });
        return;
      }

      res.status(200).json({ message: "Milestone deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
