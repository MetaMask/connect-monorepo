import { defineConfig } from 'vitest/config';

import pkg from './package.json';

export default defineConfig({
  define: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/fixtures.test.ts', // Exclude fixtures helper file
    ],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Use setup file to handle unhandled rejections gracefully
    setupFiles: ['./tests/setup.ts'],
  },
});
