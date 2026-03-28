import { describe, it, expect } from "vitest";
import { passwordResetEmail } from "../emails/passwordReset";
import { milestoneReminderEmail } from "../emails/milestoneReminder";
import { todoReminderEmail } from "../emails/todoReminder";

describe("Email Templates", () => {
  describe("passwordResetEmail", () => {
    it("renders with reset URL", () => {
      const html = passwordResetEmail(
        "https://app.test/reset?token=abc",
        "https://app.test/settings",
      );
      expect(html).toContain("https://app.test/reset?token=abc");
      expect(html).toContain("Reset Password");
    });

    it("includes unsubscribe link", () => {
      const html = passwordResetEmail(
        "https://app.test/reset?token=abc",
        "https://app.test/settings",
      );
      expect(html).toContain("https://app.test/settings?tab=notifications");
      expect(html).toContain("Manage notification preferences");
    });

    it("mentions expiry", () => {
      const html = passwordResetEmail(
        "https://app.test/reset?token=abc",
        "https://app.test/settings",
      );
      expect(html).toContain("expires in 1 hour");
    });
  });

  describe("milestoneReminderEmail", () => {
    it("renders milestone details", () => {
      const html = milestoneReminderEmail(
        "Launch MVP",
        "GitShipDone",
        "2026-04-01",
        "https://app.test/settings",
      );
      expect(html).toContain("Launch MVP");
      expect(html).toContain("GitShipDone");
      expect(html).toContain("2026-04-01");
    });

    it("includes unsubscribe link", () => {
      const html = milestoneReminderEmail(
        "Launch MVP",
        "GitShipDone",
        "2026-04-01",
        "https://app.test/settings",
      );
      expect(html).toContain("https://app.test/settings?tab=notifications");
      expect(html).toContain("Unsubscribe or manage preferences");
    });
  });

  describe("todoReminderEmail", () => {
    it("renders todo details", () => {
      const html = todoReminderEmail(
        "Write tests",
        "GitShipDone",
        "2026-04-01",
        "https://app.test/settings",
      );
      expect(html).toContain("Write tests");
      expect(html).toContain("GitShipDone");
      expect(html).toContain("2026-04-01");
    });

    it("includes unsubscribe link", () => {
      const html = todoReminderEmail(
        "Write tests",
        "GitShipDone",
        "2026-04-01",
        "https://app.test/settings",
      );
      expect(html).toContain("https://app.test/settings?tab=notifications");
      expect(html).toContain("Unsubscribe or manage preferences");
    });
  });
});
