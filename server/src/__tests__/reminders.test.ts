 
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-cron
vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

// Mock email service
const mockSendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("../services/email", () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

// Mock email templates
vi.mock("../emails/milestoneReminder", () => ({
  milestoneReminderEmail: vi
    .fn()
    .mockReturnValue("<html>milestone reminder</html>"),
}));
vi.mock("../emails/todoReminder", () => ({
  todoReminderEmail: vi.fn().mockReturnValue("<html>todo reminder</html>"),
}));

// Track query results by call order
let selectResults: any[][] = [];
let selectCallIdx = 0;

const makeChain = () => {
  const result = selectResults[selectCallIdx] || [];
  selectCallIdx++;
  const mockWhere = vi.fn().mockResolvedValue(result);
  const mockInnerJoin2 = vi.fn().mockReturnValue({ where: mockWhere });
  const mockInnerJoin1 = vi
    .fn()
    .mockReturnValue({ innerJoin: mockInnerJoin2, where: mockWhere });
  const mockFrom = vi
    .fn()
    .mockReturnValue({ innerJoin: mockInnerJoin1, where: mockWhere });
  return { from: mockFrom };
};

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelect = vi.fn().mockImplementation(() => makeChain());

vi.mock("../db", () => ({
  db: {
    select: (...args: any[]) => mockSelect(...args),
    insert: (...args: any[]) => mockInsert(...args),
  },
}));

// Mock schema
vi.mock("../db/schema", () => ({
  milestones: {
    id: "milestones.id",
    name: "milestones.name",
    dueDate: "milestones.due_date",
    projectId: "milestones.project_id",
    status: "milestones.status",
  },
  todos: {
    id: "todos.id",
    title: "todos.title",
    dueDate: "todos.due_date",
    projectId: "todos.project_id",
    isCompleted: "todos.is_completed",
    isUrgent: "todos.is_urgent",
  },
  projects: {
    id: "projects.id",
    name: "projects.name",
    userId: "projects.user_id",
    deletedAt: "projects.deleted_at",
  },
  users: {
    id: "users.id",
    email: "users.email",
    emailNotificationsEnabled: "users.email_notifications_enabled",
    deletedAt: "users.deleted_at",
  },
  notifications: {
    id: "notifications.id",
    userId: "notifications.user_id",
    type: "notifications.type",
    message: "notifications.message",
    createdAt: "notifications.created_at",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
  ne: vi.fn((...args: any[]) => ({ type: "ne", args })),
  lte: vi.fn((...args: any[]) => ({ type: "lte", args })),
  gte: vi.fn((...args: any[]) => ({ type: "gte", args })),
  isNull: vi.fn((col: any) => ({ type: "isNull", col })),
  and: vi.fn((...args: any[]) => ({ type: "and", args })),
  sql: vi.fn(),
}));

import cron from "node-cron";
import { runReminderCheck, startReminderJob } from "../jobs/reminders";

const mockSchedule = vi.mocked(cron.schedule);

const milestoneItem = {
  milestoneId: "ms-1",
  milestoneName: "Launch v1",
  dueDate: "2026-03-29",
  projectId: "proj-1",
  projectName: "MyProject",
  userId: "user-1",
  userEmail: "user@test.com",
  emailNotificationsEnabled: true,
};

const todoItem = {
  todoId: "td-1",
  todoTitle: "Fix bug",
  dueDate: "2026-03-29",
  projectId: "proj-1",
  projectName: "MyProject",
  userId: "user-1",
  userEmail: "user@test.com",
  emailNotificationsEnabled: true,
};

describe("Reminder Cron Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIdx = 0;
    // Default: no milestones, no todos (milestones query, todos query)
    selectResults = [[], []];
    mockSendEmail.mockResolvedValue(undefined);
    mockInsertValues.mockResolvedValue(undefined);
  });

  describe("runReminderCheck", () => {
    it("queries for milestones and todos due within 3 days", async () => {
      await runReminderCheck();

      // At minimum 2 select calls: milestones query + todos query
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });

    it("reports how many reminders were created", async () => {
      selectResults = [[milestoneItem], [{ count: 0 }], []];

      const result = await runReminderCheck();

      expect(result).toEqual({
        skipped: false,
        milestoneReminders: 1,
        todoReminders: 0,
      });
    });

    it("skips overlapping runs instead of double-processing", async () => {
      const [first, second] = await Promise.all([
        runReminderCheck(),
        runReminderCheck(),
      ]);

      expect(first.skipped).toBe(false);
      expect(second.skipped).toBe(true);
      // Only the first run queried the database
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });

    it("creates notification for due milestone", async () => {
      // milestones query -> dedup check -> todos query
      selectResults = [[milestoneItem], [{ count: 0 }], []];

      await runReminderCheck();

      expect(mockInsert).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          projectId: "proj-1",
          type: "milestone_due",
          message: expect.stringContaining("Launch v1"),
        }),
      );
    });

    it("sends email for milestone when email notifications enabled", async () => {
      selectResults = [[milestoneItem], [{ count: 0 }], []];

      await runReminderCheck();

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          subject: expect.stringContaining("Launch v1"),
        }),
      );
    });

    it("does not send email when email notifications disabled", async () => {
      selectResults = [
        [{ ...milestoneItem, emailNotificationsEnabled: false }],
        [{ count: 0 }],
        [],
      ];

      await runReminderCheck();

      expect(mockInsert).toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("deduplicates — skips if notification already created today", async () => {
      selectResults = [[milestoneItem], [{ count: 1 }], []];

      await runReminderCheck();

      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("creates notification for urgent todo", async () => {
      // milestones query (empty) -> todos query -> dedup check
      selectResults = [[], [todoItem], [{ count: 0 }]];

      await runReminderCheck();

      expect(mockInsert).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          type: "todo_due",
          message: expect.stringContaining("Fix bug"),
        }),
      );
    });

    it("sends email for urgent todo when email notifications enabled", async () => {
      selectResults = [[], [todoItem], [{ count: 0 }]];

      await runReminderCheck();

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          subject: expect.stringContaining("Fix bug"),
        }),
      );
    });

    it("does nothing when no items are due", async () => {
      selectResults = [[], []];

      await runReminderCheck();

      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("continues processing when one milestone errors", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const milestone2 = {
        ...milestoneItem,
        milestoneId: "ms-2",
        milestoneName: "Succeed",
        userId: "user-2",
        userEmail: "c@d.com",
      };
      // milestones query -> dedup1 -> dedup2 -> todos query
      selectResults = [
        [milestoneItem, milestone2],
        [{ count: 0 }],
        [{ count: 0 }],
        [],
      ];
      mockInsertValues
        .mockRejectedValueOnce(new Error("DB error"))
        .mockResolvedValueOnce(undefined);

      await runReminderCheck();

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Error processing milestone ms-1"),
        expect.any(Error),
      );
      spy.mockRestore();
    });

    it("includes due date in notification message", async () => {
      selectResults = [[milestoneItem], [{ count: 0 }], []];

      await runReminderCheck();

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("2026-03-29"),
        }),
      );
    });
  });

  describe("startReminderJob", () => {
    it("schedules cron job at 8:00 AM UTC daily", () => {
      startReminderJob();

      expect(mockSchedule).toHaveBeenCalledWith(
        "0 8 * * *",
        expect.any(Function),
      );
    });

    it("logs startup message", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      startReminderJob();

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Cron job scheduled"),
      );
      spy.mockRestore();
    });
  });
});
