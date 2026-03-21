/**
 * Email service — sends transactional emails via Resend.
 * In development (no RESEND_API_KEY), logs emails to console instead.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email. Uses Resend in production, logs to console otherwise.
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

/**
 * Send a password reset email with a link containing the raw token.
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
): Promise<void> {
  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: email,
    subject: "Reset your GitShipDone password",
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset for your GitShipDone account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
