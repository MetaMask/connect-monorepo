// eslint-disable-next-line import-x/no-nodejs-modules
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/fixtures.test.ts',
    ],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
  resolve: {
    alias: {
      '@metamask/connect-multichain': resolve(
        // eslint-disable-next-line no-restricted-globals
        __dirname,
        './src/mocks/connect-multichain.ts',
      ),
      '@metamask/solana-wallet-standard': resolve(
        // eslint-disable-next-line no-restricted-globals
        __dirname,
        './src/mocks/solana-wallet-standard.ts',
      ),
    },
  },
});
