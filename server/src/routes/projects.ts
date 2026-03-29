import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";

import { db } from "../db";
import { projects, milestones, todos } from "../db/schema";
import {
  createProjectSchema,
  updateProjectSchema,
  manualPointsSchema,
  progressOverrideSchema,
} from "../validators/projects";
import { awardPoints } from "../services/pointsService";
import { logTimelineEvent } from "../services/timelineService";
import { getOwnedProject } from "../utils/projectOwnership";

const router = Router();

/**
 * POST /api/projects
 * Create a new project for the authenticated user.
 * Optionally seeds milestone templates if provided.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, description, type, milestoneTemplates } = parsed.data;
    const userId = req.userId!;

    const result = await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          userId,
          name,
          description: description ?? null,
          type,
          status: "active",
        })
        .returning();

      if (milestoneTemplates && milestoneTemplates.length > 0) {
        await tx.insert(milestones).values(
          milestoneTemplates.map((templateName, idx) => ({
            projectId: project.id,
            name: templateName,
            sortOrder: idx,
          })),
        );
      }

      return project;
    });

    await logTimelineEvent(result.id, "status_change", {
      from: null,
      to: "active",
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects
 * List all non-deleted projects for the authenticated user,
 * sorted by updated_at descending, capped at 50.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const result = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
      .orderBy(desc(projects.updatedAt))
      .limit(50);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:id
 * Get single project detail with milestones and todos.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const project = await getOwnedProject(projectId, req.userId!);

    const [projectMilestones, projectTodos] = await Promise.all([
      db
        .select()
        .from(milestones)
        .where(eq(milestones.projectId, project.id))
        .orderBy(milestones.sortOrder),
      db
        .select()
        .from(todos)
        .where(eq(todos.projectId, project.id))
        .orderBy(todos.sortOrder),
    ]);

    res.status(200).json({
      ...project,
      milestones: projectMilestones,
      todos: projectTodos,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/projects/:id
 * Update editable project fields. Logs a status_change timeline event when status changes.
 */
router.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const updates = parsed.data;
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const projectId = req.params.id as string;
      const project = await getOwnedProject(projectId, req.userId!);

      const statusChanged =
        updates.status !== undefined && updates.status !== project.status;
      const oldStatus = project.status;

      const [updated] = await db
        .update(projects)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(projects.id, project.id))
        .returning();

      if (statusChanged) {
        await logTimelineEvent(project.id, "status_change", {
          from: oldStatus,
          to: updates.status,
        });
      }

      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/projects/:id/points
 * Manually adjust points for a project with a required reason.
 */
router.post(
  "/:id/points",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = manualPointsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const projectId = req.params.id as string;
      await getOwnedProject(projectId, req.userId!);

      const { delta, reason } = parsed.data;
      const result = await awardPoints(projectId, delta, reason, "manual");

      res.status(200).json({
        pointsTotal: result.newTotal,
        level: result.level,
        didLevelUp: result.didLevelUp,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/projects/:id/progress
 * Manually set or clear progress override. Logs a progress_change timeline event.
 */
router.patch(
  "/:id/progress",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = progressOverrideSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const projectId = req.params.id as string;
      const project = await getOwnedProject(projectId, req.userId!);

      const { progressManual } = parsed.data;

      const [updated] = await db
        .update(projects)
        .set({ progressManual, updatedAt: new Date() })
        .where(eq(projects.id, project.id))
        .returning();

      await logTimelineEvent(project.id, "progress_change", {
        isManual: true,
        to: progressManual,
      });

      res.status(200).json({
        progressAuto: updated.progressAuto,
        progressManual: updated.progressManual,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/projects/:id
 * Soft delete a project by setting deleted_at to current timestamp.
 */
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const project = await getOwnedProject(projectId, req.userId!);

      await db
        .update(projects)
        .set({ deletedAt: new Date() })
        .where(eq(projects.id, project.id));

      res.status(200).json({ message: "Project deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
