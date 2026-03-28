import app from './app';
import { pool } from './db';
import { startGithubSyncJob } from './jobs/githubSync';
import { startReminderJob } from './jobs/reminders';

const PORT = process.env.PORT || 3001;

pool
  .query('SELECT 1')
  .then(() => {
    console.log('[DB] Connected to PostgreSQL');
    startGithubSyncJob();
    startReminderJob();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err);
    process.exit(1);
  });
