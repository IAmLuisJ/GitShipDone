/**
 * Email service — sends transactional emails via Resend SDK.
 * In development (no RESEND_API_KEY), logs emails to console instead.
 */
import { Resend } from "resend";
import { passwordResetEmail } from "../emails/passwordReset";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email. Uses Resend SDK in production, logs to console otherwise.
 * Errors are caught and logged — callers are not interrupted by email failures.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || "noreply@gitshipdone.com";

  if (!apiKey) {
    console.log("[EMAIL STUB] To:", options.to);
    console.log("[EMAIL STUB] Subject:", options.subject);
    console.log("[EMAIL STUB] Body:", options.html);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    console.error("[EMAIL ERROR] Failed to send email:", error);
  }
}

/**
 * Send a password reset email with a link containing the raw token.
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
  const settingsUrl = `${frontendUrl}/settings`;

  await sendEmail({
    to: email,
    subject: "Reset your GitShipDone password",
    html: passwordResetEmail(resetLink, settingsUrl),
  });
}
