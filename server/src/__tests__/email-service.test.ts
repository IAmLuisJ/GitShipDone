import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue({ id: "test-email-id" });

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockSend } };
  }),
}));

import { sendEmail, sendPasswordResetEmail } from "../services/email";
import { Resend } from "resend";

describe("Email Service", () => {
  beforeEach(() => {
    mockSend.mockClear();
    (Resend as unknown as ReturnType<typeof vi.fn>).mockClear();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    delete process.env.FRONTEND_URL;
  });

  describe("sendEmail", () => {
    it("logs to console when RESEND_API_KEY is not set", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "[EMAIL STUB] To:",
        "test@example.com",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[EMAIL STUB] Subject:",
        "Test",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[EMAIL STUB] Body:",
        "<p>Hello</p>",
      );
      expect(mockSend).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("uses Resend SDK when API key is set", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      await sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });
      expect(Resend).toHaveBeenCalledWith("re_test_key");
      expect(mockSend).toHaveBeenCalledWith({
        from: "noreply@gitshipdone.com",
        to: "test@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });
    });

    it("uses custom FROM address when set", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.EMAIL_FROM = "custom@example.com";
      await sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: "custom@example.com" }),
      );
    });

    it("catches and logs errors from Resend", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      mockSend.mockRejectedValueOnce(new Error("API Error"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await sendEmail({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "[EMAIL ERROR] Failed to send email:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("does not throw on Resend errors", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      mockSend.mockRejectedValueOnce(new Error("API Error"));
      vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(
        sendEmail({ to: "a@b.com", subject: "X", html: "" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("sends email with correct reset URL", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await sendPasswordResetEmail("user@example.com", "abc123token");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[EMAIL STUB] To:",
        "user@example.com",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[EMAIL STUB] Subject:",
        "Reset your GitShipDone password",
      );
      const htmlArg = consoleSpy.mock.calls.find(
        (c) => c[0] === "[EMAIL STUB] Body:",
      )?.[1] as string;
      expect(htmlArg).toContain(
        "http://localhost:3000/reset-password?token=abc123token",
      );
      consoleSpy.mockRestore();
    });

    it("includes unsubscribe link in email", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await sendPasswordResetEmail("user@example.com", "abc123token");
      const htmlArg = consoleSpy.mock.calls.find(
        (c) => c[0] === "[EMAIL STUB] Body:",
      )?.[1] as string;
      expect(htmlArg).toContain("?tab=notifications");
      expect(htmlArg).toContain("Manage notification preferences");
      consoleSpy.mockRestore();
    });

    it("uses custom FRONTEND_URL when set", async () => {
      process.env.FRONTEND_URL = "https://app.gitshipdone.com";
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await sendPasswordResetEmail("user@example.com", "tok");
      const htmlArg = consoleSpy.mock.calls.find(
        (c) => c[0] === "[EMAIL STUB] Body:",
      )?.[1] as string;
      expect(htmlArg).toContain(
        "https://app.gitshipdone.com/reset-password?token=tok",
      );
      consoleSpy.mockRestore();
    });
  });
});
