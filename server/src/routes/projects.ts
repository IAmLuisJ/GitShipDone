import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";

import { db } from "../db";
import { projects, milestones, todos, timelineEvents } from "../db/schema";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../validators/projects";
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

      await tx.insert(timelineEvents).values({
        projectId: project.id,
        type: "status_change",
        payload: { from: null, to: "active" },
      });

      return project;
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
        await db.insert(timelineEvents).values({
          projectId: project.id,
          type: "status_change",
          payload: { from: oldStatus, to: updates.status },
        });
      }

      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
