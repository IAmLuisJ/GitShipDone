import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    // Unit tests cover all surfaces, including post-MVP ones that are
    // feature-flagged off by default (see src/middleware/features.ts).
    env: {
      FEATURE_AI: 'true',
      FEATURE_GITHUB: 'true',
      FEATURE_OAUTH: 'true',
      FEATURE_REMINDERS: 'true',
    },
  },
});
