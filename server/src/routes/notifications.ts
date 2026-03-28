import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc, lt, or, count } from "drizzle-orm";

import { db } from "../db";
import { notifications } from "../db/schema";

const router = Router();

/**
 * GET /api/notifications
 * List notifications for the authenticated user.
 * Excludes snoozed notifications where snoozed_until > NOW().
 * Supports ?unreadOnly=true to filter only unread.
 * Returns { notifications, unreadCount }.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const unreadOnly = req.query.unreadOnly === "true";
    const now = new Date();

    const baseConditions = [
      eq(notifications.userId, userId),
      or(
        isNull(notifications.snoozedUntil),
        lt(notifications.snoozedUntil, now),
      ),
    ];

    const listConditions = unreadOnly
      ? [...baseConditions, eq(notifications.isRead, false)]
      : baseConditions;

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...listConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const [{ value: unreadCount }] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          or(
            isNull(notifications.snoozedUntil),
            lt(notifications.snoozedUntil, now),
          ),
        ),
      );

    res.json({ notifications: rows, unreadCount });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:nid/read
 * Mark a single notification as read.
 */
router.patch(
  "/:nid/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const nid = req.params.nid as string;

      const [notification] = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, nid), eq(notifications.userId, userId)))
        .limit(1);

      if (!notification) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, nid));

      res.json({ message: "Notification marked as read" });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/notifications/read-all
 * Mark all unread notifications for the authenticated user as read.
 */
router.post(
  "/read-all",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false),
          ),
        );

      const updated =
        typeof (result as unknown as { rowCount: number }).rowCount === "number"
          ? (result as unknown as { rowCount: number }).rowCount
          : 0;

      res.json({ updated });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/notifications/:nid/snooze
 * Snooze a notification until a specified date/time.
 * Body: { snoozeUntil: ISO datetime string }
 * snoozeUntil must be in the future.
 */
router.patch(
  "/:nid/snooze",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const nid = req.params.nid as string;
      const { snoozeUntil } = req.body;

      if (!snoozeUntil || typeof snoozeUntil !== "string") {
        res.status(400).json({ error: "snoozeUntil is required and must be an ISO datetime string" });
        return;
      }

      const snoozeDate = new Date(snoozeUntil);
      if (isNaN(snoozeDate.getTime())) {
        res.status(400).json({ error: "snoozeUntil must be a valid ISO datetime string" });
        return;
      }

      if (snoozeDate <= new Date()) {
        res.status(400).json({ error: "snoozeUntil must be in the future" });
        return;
      }

      const [notification] = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, nid), eq(notifications.userId, userId)))
        .limit(1);

      if (!notification) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }

      const [updated] = await db
        .update(notifications)
        .set({ snoozedUntil: snoozeDate })
        .where(eq(notifications.id, nid))
        .returning();

      res.json({ notification: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
