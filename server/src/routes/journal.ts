import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc, count } from "drizzle-orm";

import { db } from "../db";
import { journalEntries } from "../db/schema";
import {
  createJournalSchema,
  updateJournalSchema,
} from "../validators/journal";
import { getOwnedProject } from "../utils/projectOwnership";
import { awardPoints } from "../services/pointsService";
import { logTimelineEvent } from "../services/timelineService";

const router = Router({ mergeParams: true });

/**
 * POST /api/projects/:id/journal
 * Create a journal entry. Awards +5 points and logs a timeline event.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const parsed = createJournalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, body, mood } = parsed.data;

    const [entry] = await db
      .insert(journalEntries)
      .values({
        projectId,
        title,
        body,
        mood: mood ?? null,
      })
      .returning();

    // Award +5 points for journal entry
    await awardPoints(projectId, 5, `Journal entry: ${title}`, "journal");

    // Log journal timeline event
    await logTimelineEvent(
      projectId,
      "journal",
      { entryId: entry.id, title, mood: mood ?? null },
      entry.id,
    );

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:id/journal
 * List journal entries, paginated, newest first. Excludes soft-deleted.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit as string) || 20, 1),
      100,
    );
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(journalEntries.projectId, projectId),
      isNull(journalEntries.deletedAt),
    );

    const [entries, [{ total }]] = await Promise.all([
      db
        .select()
        .from(journalEntries)
        .where(whereClause)
        .orderBy(desc(journalEntries.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(journalEntries).where(whereClause),
    ]);

    res.json({ entries, total, page, limit });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/projects/:id/journal/:jid
 * Update a journal entry's title, body, or mood. Returns 404 if soft-deleted.
 */
router.patch(
  "/:jid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const jid = req.params.jid as string;
      await getOwnedProject(projectId, req.userId!);

      const parsed = updateJournalSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const existing = await db
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.id, jid),
            eq(journalEntries.projectId, projectId),
            isNull(journalEntries.deletedAt),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        res.status(404).json({ error: "Journal entry not found" });
        return;
      }

      const [updated] = await db
        .update(journalEntries)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(journalEntries.id, jid))
        .returning();

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/projects/:id/journal/:jid
 * Soft delete a journal entry by setting deleted_at.
 */
router.delete(
  "/:jid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const jid = req.params.jid as string;
      await getOwnedProject(projectId, req.userId!);

      const existing = await db
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.id, jid),
            eq(journalEntries.projectId, projectId),
            isNull(journalEntries.deletedAt),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        res.status(404).json({ error: "Journal entry not found" });
        return;
      }

      await db
        .update(journalEntries)
        .set({ deletedAt: new Date() })
        .where(eq(journalEntries.id, jid));

      res.json({ message: "Journal entry deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
