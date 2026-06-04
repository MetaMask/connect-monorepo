import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Vitest config for tests in `scripts/` (repo-root tooling that does not live
// inside any workspace package). Run via `yarn test:scripts` from the repo
// root. Workspace packages each have their own `vitest.config.ts` and are run
// via `yarn test:packages` / Turbo.
//
// `create-package/` is excluded because those tests are Jest-based (use
// `jest.mock`, `jest.useFakeTimers`, etc.) and not currently wired into any
// runner.
//
// This config lives inside `scripts/` (rather than at the repo root) so that
// vitest's upward config discovery does not accidentally apply it to workspace
// packages that run `vitest` without a local config (e.g. `@metamask/analytics`).
// Pin the vitest root to this directory so the project-wide include glob
// doesn't accidentally pick up tests in workspace packages when invoked from
// the repo root (e.g. `yarn test:scripts`).
const scriptsDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    root: scriptsDir,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      'create-package/**',
    ],
  },
});
