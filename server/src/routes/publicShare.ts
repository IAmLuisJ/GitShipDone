import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";

import { db } from "../db";
import {
  projects,
  milestones,
  todos,
  journalEntries,
  timelineEvents,
} from "../db/schema";

const router = Router();

/**
 * GET /api/share/:token
 * Public endpoint — no auth required.
 * Returns read-only project data for the share page.
 */
router.get(
  "/:token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.params.token as string;

      const [project] = await db
        .select({
          id: projects.id,
          name: projects.name,
          type: projects.type,
          description: projects.description,
          status: projects.status,
          progressAuto: projects.progressAuto,
          progressManual: projects.progressManual,
          pointsTotal: projects.pointsTotal,
          level: projects.level,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(
          and(
            eq(projects.shareToken, token),
            eq(projects.isPublic, true),
            isNull(projects.deletedAt),
          ),
        );

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const [projectMilestones, projectTodos, projectJournal, timeline] =
        await Promise.all([
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
          db
            .select()
            .from(journalEntries)
            .where(
              and(
                eq(journalEntries.projectId, project.id),
                isNull(journalEntries.deletedAt),
              ),
            )
            .orderBy(desc(journalEntries.createdAt)),
          db
            .select()
            .from(timelineEvents)
            .where(eq(timelineEvents.projectId, project.id))
            .orderBy(desc(timelineEvents.createdAt))
            .limit(50),
        ]);

      res.status(200).json({
        project,
        milestones: projectMilestones,
        todos: projectTodos,
        journalEntries: projectJournal,
        timeline,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
