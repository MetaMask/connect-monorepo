/* eslint-disable @typescript-eslint/explicit-function-return-type -- Tsup config convention */

import { defineConfig } from 'tsup';

import pkg from './package.json';

const deps = Object.keys(
  (pkg as { dependencies?: Record<string, string> }).dependencies ?? {},
);
const peerDeps = Object.keys(
  (pkg as { peerDependencies?: Record<string, string> }).peerDependencies ?? {},
);
const external = [...deps, ...peerDeps];
const entryName = (pkg as { name: string }).name.replace('@metamask/', '');

export default defineConfig([
  {
    entry: { [entryName]: 'src/index.ts' },
    outDir: 'dist/browser/es',
    format: 'esm',
    platform: 'browser',
    bundle: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external,
    tsconfig: './tsconfig.json',
    esbuildOptions: (options) => {
      options.platform = 'browser';
      options.mainFields = ['browser', 'module', 'main'];
      options.conditions = ['browser'];
      options.outExtension = { '.js': '.mjs' };
    },
  },
  {
    entry: { [entryName]: 'src/index.ts' },
    outDir: 'dist/node/cjs',
    format: 'cjs',
    platform: 'node',
    bundle: true,
    splitting: false,
    sourcemap: true,
    external,
    tsconfig: './tsconfig.json',
    esbuildOptions: (options) => {
      options.platform = 'node';
      options.mainFields = ['module', 'main'];
      options.conditions = ['node'];
      options.outExtension = { '.js': '.js' };
    },
  },
  {
    entry: { index: 'src/index.ts' },
    outDir: 'dist/types',
    tsconfig: './tsconfig.types.json',
    dts: { only: true },
  },
]);
