/**
 * Milestone reminder email template.
 * Returns an HTML string for milestone due-date reminders.
 */
export function milestoneReminderEmail(
  milestoneName: string,
  projectName: string,
  dueDate: string,
  settingsUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="color: #2563eb;">Milestone Reminder</h2>
  <p>Your milestone <strong>${milestoneName}</strong> in project <strong>${projectName}</strong> is due on <strong>${dueDate}</strong>.</p>
  <p style="color: #6b7280;">Don't forget to check in and update your progress!</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">
    You're receiving this because you have email notifications enabled on GitShipDone.
    <a href="${settingsUrl}?tab=notifications" style="color: #9ca3af;">Unsubscribe or manage preferences</a>
  </p>
</body>
</html>`;
}
