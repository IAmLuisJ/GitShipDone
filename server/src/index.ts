import app from './app';
import { validateEnv } from './config/validateEnv';
import { pool } from './db';
import { isFeatureEnabled } from './middleware/features';
import { startGithubSyncJob } from './jobs/githubSync';
import { startReminderJob } from './jobs/reminders';

validateEnv();

const PORT = process.env.PORT || 3001;

pool
  .query('SELECT 1')
  .then(() => {
    console.log('[DB] Connected to PostgreSQL');
    if (isFeatureEnabled('github')) {
      startGithubSyncJob();
    }
    // With CRON_SECRET set, an external scheduler triggers reminders via
    // POST /api/jobs/reminders/run instead of in-process cron (needed on
    // hosts like Passenger that stop idle processes).
    if (isFeatureEnabled('reminders') && !process.env.CRON_SECRET) {
      startReminderJob();
    }
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err);
    process.exit(1);
  });
