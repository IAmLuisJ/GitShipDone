/**
 * Todo reminder email template.
 * Returns an HTML string for urgent todo due-date reminders.
 */
export function todoReminderEmail(
  todoTitle: string,
  projectName: string,
  dueDate: string,
  settingsUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="color: #2563eb;">Todo Reminder</h2>
  <p>Your todo <strong>${todoTitle}</strong> in project <strong>${projectName}</strong> is due on <strong>${dueDate}</strong>.</p>
  <p style="color: #6b7280;">Time to get it done!</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">
    You're receiving this because you have email notifications enabled on GitShipDone.
    <a href="${settingsUrl}?tab=notifications" style="color: #9ca3af;">Unsubscribe or manage preferences</a>
  </p>
</body>
</html>`;
}
