/**
 * Password reset email template.
 * Returns an HTML string for the password reset email.
 */
export function passwordResetEmail(
  resetUrl: string,
  settingsUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="color: #2563eb;">Reset Your Password</h2>
  <p>You requested a password reset for your GitShipDone account.</p>
  <p>
    <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
  </p>
  <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">
    You're receiving this because you have a GitShipDone account.
    <a href="${settingsUrl}?tab=notifications" style="color: #9ca3af;">Manage notification preferences</a>
  </p>
</body>
</html>`;
}
