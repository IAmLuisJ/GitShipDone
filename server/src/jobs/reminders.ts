import cron from "node-cron";
import { db } from "../db";
import {
  milestones,
  todos,
  projects,
  users,
  notifications,
} from "../db/schema";
import { eq, and, ne, lte, gte, isNull, sql } from "drizzle-orm";
import { sendEmail } from "../services/email";
import { milestoneReminderEmail } from "../emails/milestoneReminder";
import { todoReminderEmail } from "../emails/todoReminder";

/**
 * Check for milestones and todos due within 3 days,
 * create in-app notifications (deduplicated per day),
 * and send reminder emails if the user has opted in.
 */
export async function runReminderCheck(): Promise<void> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const threeDaysStr = threeDaysLater.toISOString().split("T")[0];
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const settingsUrl = `${frontendUrl}/settings`;

  // --- Milestone reminders ---
  const dueMilestones = await db
    .select({
      milestoneId: milestones.id,
      milestoneName: milestones.name,
      dueDate: milestones.dueDate,
      projectId: projects.id,
      projectName: projects.name,
      userId: projects.userId,
      userEmail: users.email,
      emailNotificationsEnabled: users.emailNotificationsEnabled,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .innerJoin(users, eq(projects.userId, users.id))
    .where(
      and(
        ne(milestones.status, "completed"),
        gte(milestones.dueDate, todayStr),
        lte(milestones.dueDate, threeDaysStr),
        isNull(projects.deletedAt),
        isNull(users.deletedAt),
      ),
    );

  const todayStart = new Date(todayStr + "T00:00:00.000Z");

  for (const m of dueMilestones) {
    try {
      // Deduplication: check if notification already created today for this milestone
      const existing = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, m.userId),
            eq(notifications.type, "milestone_due"),
            eq(
              notifications.message,
              `Milestone "${m.milestoneName}" in ${m.projectName} is due on ${m.dueDate}`,
            ),
            gte(notifications.createdAt, todayStart),
          ),
        );

      if (existing[0]?.count > 0) continue;

      const message = `Milestone "${m.milestoneName}" in ${m.projectName} is due on ${m.dueDate}`;
      await db.insert(notifications).values({
        userId: m.userId,
        projectId: m.projectId,
        type: "milestone_due",
        message,
      });

      if (m.emailNotificationsEnabled) {
        await sendEmail({
          to: m.userEmail,
          subject: `Reminder: "${m.milestoneName}" is due on ${m.dueDate}`,
          html: milestoneReminderEmail(
            m.milestoneName,
            m.projectName,
            m.dueDate!,
            settingsUrl,
          ),
        });
      }
    } catch (error) {
      console.error(
        `[Reminders] Error processing milestone ${m.milestoneId}:`,
        error,
      );
    }
  }

  // --- Urgent todo reminders ---
  const dueTodos = await db
    .select({
      todoId: todos.id,
      todoTitle: todos.title,
      dueDate: todos.dueDate,
      projectId: projects.id,
      projectName: projects.name,
      userId: projects.userId,
      userEmail: users.email,
      emailNotificationsEnabled: users.emailNotificationsEnabled,
    })
    .from(todos)
    .innerJoin(projects, eq(todos.projectId, projects.id))
    .innerJoin(users, eq(projects.userId, users.id))
    .where(
      and(
        eq(todos.isCompleted, false),
        eq(todos.isUrgent, true),
        gte(todos.dueDate, todayStr),
        lte(todos.dueDate, threeDaysStr),
        isNull(projects.deletedAt),
        isNull(users.deletedAt),
      ),
    );

  for (const t of dueTodos) {
    try {
      const existing = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, t.userId),
            eq(notifications.type, "todo_due"),
            eq(
              notifications.message,
              `Todo "${t.todoTitle}" in ${t.projectName} is due on ${t.dueDate}`,
            ),
            gte(notifications.createdAt, todayStart),
          ),
        );

      if (existing[0]?.count > 0) continue;

      const message = `Todo "${t.todoTitle}" in ${t.projectName} is due on ${t.dueDate}`;
      await db.insert(notifications).values({
        userId: t.userId,
        projectId: t.projectId,
        type: "todo_due",
        message,
      });

      if (t.emailNotificationsEnabled) {
        await sendEmail({
          to: t.userEmail,
          subject: `Reminder: "${t.todoTitle}" is due on ${t.dueDate}`,
          html: todoReminderEmail(
            t.todoTitle,
            t.projectName,
            t.dueDate!,
            settingsUrl,
          ),
        });
      }
    } catch (error) {
      console.error(
        `[Reminders] Error processing todo ${t.todoId}:`,
        error,
      );
    }
  }
}

/**
 * Start the daily reminder cron job at 8:00 AM UTC.
 */
export function startReminderJob(): void {
  cron.schedule("0 8 * * *", () => {
    runReminderCheck().catch((err) =>
      console.error("[Reminders] Scheduled check failed:", err),
    );
  });

  console.log("[Reminders] Cron job scheduled (daily at 8:00 AM UTC)");
}
