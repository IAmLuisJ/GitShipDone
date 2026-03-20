import app from './app';
import { pool } from './db';

const PORT = process.env.PORT || 3001;

pool
  .query('SELECT 1')
  .then(() => {
    console.log('[DB] Connected to PostgreSQL');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err);
    process.exit(1);
  });
