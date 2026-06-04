import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only the top-level standalone scripts are covered here. The
    // `create-package` suite uses Jest-style globals/APIs and is not run by
    // this config.
    include: ['scripts/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
